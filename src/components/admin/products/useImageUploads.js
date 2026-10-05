"use client";

import { useCallback, useRef, useState } from "react";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // mirrors src/config/server.js
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const CONCURRENCY = 2;

let uid = 0;

/** Client-side pre-check (the server re-validates the actual bytes). */
export function precheckFile(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Unsupported type — use JPG, PNG, WebP or AVIF.";
  if (file.size > MAX_IMAGE_BYTES) return `Too large (${(file.size / 1024 / 1024).toFixed(1)} MB) — max 8 MB.`;
  if (file.size === 0) return "The file is empty.";
  return null;
}

/** One XHR per file so each has real upload progress and an isolated result. */
function uploadOne(url, file, alt, onProgress) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);
    if (alt) form.append("alt", alt);

    xhr.upload.onprogress = (event) => event.lengthComputable && onProgress(Math.round((event.loaded / event.total) * 100));
    xhr.onload = () => {
      let payload = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status >= 200 && xhr.status < 300 && payload?.ok) resolve({ ok: true, data: payload.data });
      else resolve({ ok: false, message: payload?.error?.message ?? `Upload failed (HTTP ${xhr.status}).` });
    };
    xhr.onerror = () => resolve({ ok: false, message: "Network error — check your connection and retry." });
    xhr.ontimeout = () => resolve({ ok: false, message: "The upload timed out." });
    xhr.timeout = 120_000;
    xhr.open("POST", url);
    xhr.send(form);
  });
}

/**
 * Upload queue: items { key, file, previewUrl, status: queued|uploading|done|error, progress, error }.
 * `uploadUrl(productId)` decides the endpoint; `onUploaded(item, data)` receives each server result.
 */
export function useImageUploads({ uploadUrl, onUploaded }) {
  const [items, setItems] = useState([]);
  // The ref is the source of truth (start() may run right after add(), before a
  // re-render); every update goes through commit() which keeps ref and state in sync.
  const itemsRef = useRef([]);
  const commit = useCallback((updater) => {
    itemsRef.current = updater(itemsRef.current);
    setItems(itemsRef.current);
  }, []);

  const patch = useCallback((key, changes) => commit((list) => list.map((item) => (item.key === key ? { ...item, ...changes } : item))), [commit]);

  const add = useCallback(
    (fileList) => {
      const next = [...fileList].map((file) => {
        const problem = precheckFile(file);
        return {
          key: `u${++uid}`,
          file,
          name: file.name,
          previewUrl: URL.createObjectURL(file),
          status: problem ? "error" : "queued",
          progress: 0,
          error: problem,
        };
      });
      commit((list) => [...list, ...next]);
      return next;
    },
    [commit],
  );

  const remove = useCallback(
    (key) => {
      const item = itemsRef.current.find((entry) => entry.key === key);
      if (item) URL.revokeObjectURL(item.previewUrl);
      commit((list) => list.filter((entry) => entry.key !== key));
    },
    [commit],
  );

  /** Upload every queued item (and optionally retry errored ones) with limited concurrency. */
  const start = useCallback(
    async (productId, { retryFailed = false } = {}) => {
      const queue = itemsRef.current.filter((item) => item.status === "queued" || (retryFailed && item.status === "error" && !precheckFile(item.file)));
      let succeeded = 0;
      let failed = 0;

      const worker = async () => {
        while (queue.length) {
          const item = queue.shift();
          patch(item.key, { status: "uploading", progress: 0, error: null });
          const result = await uploadOne(uploadUrl(productId), item.file, "", (progress) => patch(item.key, { progress }));
          if (result.ok) {
            succeeded += 1;
            onUploaded?.(item, result.data);
            remove(item.key);
          } else {
            failed += 1;
            patch(item.key, { status: "error", error: result.message });
          }
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
      return { succeeded, failed };
    },
    [patch, remove, uploadUrl, onUploaded],
  );

  return { items, add, remove, start };
}
