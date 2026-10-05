"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteCategoryAction,
  moveCategoryAction,
  removeCategoryImageAction,
  saveCategoryAction,
  setCategoryStatusAction,
} from "@/actions/admin/categories";
import { SmartImage } from "@/components/media/SmartImage";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/utils/cn";
import { ACCEPTED_TYPES, precheckFile } from "../products/useImageUploads";
import { SelectField, StatusBadge, TextArea, TextField } from "../ui";

const slugify = (value) => value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 160);
const ICON_BUTTON = "grid size-9 place-items-center text-subtle transition-colors hover:bg-bone hover:text-ink disabled:opacity-30";

/** Database-driven category tree manager (departments → subcategories). */
export function CategoryManager({ tree }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null); // { category?, parentId? }
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState(null);

  const run = (id, task, message) => {
    setBusyId(id);
    startTransition(async () => {
      if (toast.fromResult(await task(), message)) router.refresh();
      setBusyId(null);
    });
  };

  const remove = async (category) => {
    const ok = await confirm({ title: `Delete “${category.name}”?`, message: "Only empty categories can be deleted. This cannot be undone.", confirmLabel: "Delete", tone: "danger" });
    if (ok) run(category.id, () => deleteCategoryAction(category.id), "Category deleted.");
  };

  const uploadImage = (category, file) => {
    const problem = precheckFile(file);
    if (problem) return toast.error(problem);
    setBusyId(category.id);
    const form = new FormData();
    form.append("file", file);
    fetch(`/api/admin/categories/${category.id}/image`, { method: "POST", body: form })
      .then((response) => response.json().catch(() => null))
      .then((payload) => {
        if (payload?.ok) {
          toast.success("Category image updated.");
          router.refresh();
        } else toast.error(payload?.error?.message ?? "Upload failed.");
      })
      .catch(() => toast.error("Network error — please retry."))
      .finally(() => setBusyId(null));
  };

  const Row = ({ category, siblings, index, depth }) => {
    const busy = busyId === category.id && pending;
    return (
      <li className={cn("flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0 sm:flex-nowrap", depth && "bg-bone/40 ps-10")}>
        <div className="relative size-12 shrink-0 overflow-hidden bg-bone">
          {category.imageUrl ? <SmartImage src={category.imageUrl} alt="" fill sizes="48px" className="object-cover" /> : <Icon name="image" className="absolute inset-0 m-auto size-4 text-mute" />}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className={cn("truncate", depth ? "text-sm" : "font-medium")}>{category.name}</p>
          <p className="truncate text-xs text-mute">
            /collections/{category.slug} · {category.productCount} product{category.productCount === 1 ? "" : "s"}
          </p>
        </div>
        <StatusBadge status={category.status} />
        <div className="flex items-center">
          {busy || busyId === category.id ? <Spinner label="Saving" className="mx-2 text-mute" /> : null}
          <button type="button" className={ICON_BUTTON} disabled={pending || index === 0} onClick={() => run(category.id, () => moveCategoryAction(category.id, "up"))} aria-label={`Move ${category.name} up`}>
            <Icon name="arrowUp" className="size-4" />
          </button>
          <button type="button" className={ICON_BUTTON} disabled={pending || index === siblings.length - 1} onClick={() => run(category.id, () => moveCategoryAction(category.id, "down"))} aria-label={`Move ${category.name} down`}>
            <Icon name="arrowDown" className="size-4" />
          </button>
          <button
            type="button"
            className={ICON_BUTTON}
            disabled={pending}
            onClick={() => run(category.id, () => setCategoryStatusAction(category.id, category.status === "ACTIVE" ? "HIDDEN" : "ACTIVE"), category.status === "ACTIVE" ? "Category hidden." : "Category published.")}
            aria-label={category.status === "ACTIVE" ? `Hide ${category.name}` : `Publish ${category.name}`}
            title={category.status === "ACTIVE" ? "Hide" : "Publish"}
          >
            <Icon name={category.status === "ACTIVE" ? "eye" : "check"} className="size-4" />
          </button>
          <label className={cn(ICON_BUTTON, "cursor-pointer")} title="Upload image">
            <span className="sr-only">Upload image for {category.name}</span>
            <Icon name="upload" className="size-4" />
            <input type="file" accept={ACCEPTED_TYPES.join(",")} className="sr-only" onChange={(event) => event.target.files?.[0] && uploadImage(category, event.target.files[0])} />
          </label>
          {category.imageUrl ? (
            <button type="button" className={ICON_BUTTON} disabled={pending} onClick={() => run(category.id, () => removeCategoryImageAction(category.id), "Image removed.")} aria-label={`Remove image from ${category.name}`} title="Remove image">
              <Icon name="close" className="size-4" />
            </button>
          ) : null}
          <button type="button" className={ICON_BUTTON} onClick={() => setEditing({ category })} aria-label={`Edit ${category.name}`}>
            <Icon name="edit" className="size-4" />
          </button>
          <button
            type="button"
            className={cn(ICON_BUTTON, "hover:text-danger")}
            disabled={pending || category.productCount > 0 || category.children?.length > 0}
            onClick={() => remove(category)}
            aria-label={`Delete ${category.name}`}
            title={category.productCount || category.children?.length ? "Only empty categories can be deleted" : "Delete"}
          >
            <Icon name="trash" className="size-4" />
          </button>
        </div>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ parentId: null })}>
          <Icon name="plus" className="size-4" />
          New category
        </Button>
      </div>

      {tree.length === 0 ? (
        <EmptyState icon="image" title="No categories yet" description="Create a department (e.g. Men), then add subcategories under it." />
      ) : (
        tree.map((department, index) => (
          <section key={department.id} className="border border-line bg-paper" aria-label={department.name}>
            <ul>
              <Row category={department} siblings={tree} index={index} depth={0} />
              {department.children.map((child, childIndex) => (
                <Row key={child.id} category={child} siblings={department.children} index={childIndex} depth={1} />
              ))}
            </ul>
            <div className="border-t border-line px-4 py-2.5 ps-10">
              <button type="button" className="inline-flex min-h-9 items-center gap-2 text-sm text-subtle hover:text-ink" onClick={() => setEditing({ parentId: department.id })}>
                <Icon name="plus" className="size-4" /> Add subcategory to {department.name}
              </button>
            </div>
          </section>
        ))
      )}

      <Drawer open={Boolean(editing)} onClose={() => setEditing(null)} label={editing?.category ? "Edit category" : "New category"} side="end">
        {editing ? (
          <CategoryForm
            key={editing.category?.id ?? `new-${editing.parentId}`}
            category={editing.category}
            defaultParentId={editing.parentId}
            departments={tree}
            onDone={() => {
              setEditing(null);
              router.refresh();
            }}
          />
        ) : null}
      </Drawer>
    </div>
  );
}

function CategoryForm({ category, defaultParentId, departments, onDone }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    description: category?.description ?? "",
    parentId: category ? category.parentId ?? "" : defaultParentId ?? "",
    status: category?.status ?? "ACTIVE",
  });
  const [slugTouched, setSlugTouched] = useState(Boolean(category));
  const [errors, setErrors] = useState({});
  const [saving, startSaving] = useTransition();
  const hasChildren = Boolean(category?.children?.length);

  const submit = (event) => {
    event.preventDefault();
    startSaving(async () => {
      const result = await saveCategoryAction(category?.id ?? null, { ...form, parentId: form.parentId || null });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      toast.success(category ? "Category saved." : "Category created.");
      onDone();
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex h-full flex-col gap-6 overflow-y-auto px-6 pb-8 pt-16 sm:px-8">
      <h2 className="font-display text-3xl font-light">{category ? "Edit category" : "New category"}</h2>
      <TextField
        id="category-name"
        label="Name"
        required
        maxLength={120}
        value={form.name}
        error={errors.name}
        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value, ...(!slugTouched && { slug: slugify(event.target.value) }) }))}
      />
      <TextField
        id="category-slug"
        label="Slug"
        required
        maxLength={160}
        value={form.slug}
        error={errors.slug}
        hint={`URL: /collections/${form.slug || "…"}`}
        onChange={(event) => {
          setSlugTouched(true);
          setForm((current) => ({ ...current, slug: slugify(event.target.value) }));
        }}
      />
      <SelectField
        id="category-parent"
        label="Parent"
        value={form.parentId}
        error={errors.parentId}
        disabled={hasChildren}
        hint={hasChildren ? "Has subcategories, so it must stay a top-level department." : "Leave empty for a top-level department."}
        onChange={(event) => setForm((current) => ({ ...current, parentId: event.target.value }))}
      >
        <option value="">None (department)</option>
        {departments
          .filter((department) => department.id !== category?.id)
          .map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
      </SelectField>
      <SelectField id="category-status" label="Status" value={form.status} error={errors.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
        <option value="ACTIVE">Active — visible in the store</option>
        <option value="HIDDEN">Hidden</option>
      </SelectField>
      <TextArea id="category-description" label="Description" rows={4} value={form.description} error={errors.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
      <div className="mt-auto flex gap-3 pt-4">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : category ? "Save changes" : "Create category"}
        </Button>
      </div>
    </form>
  );
}
