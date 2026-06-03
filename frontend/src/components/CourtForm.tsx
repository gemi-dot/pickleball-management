"use client";

import { useState } from "react";
import { Modal, FormField, TextInput, SelectInput } from "./Form";
import { Court } from "@/lib/api/types";
import { createCourt, updateCourt } from "@/lib/api/courts";

interface CourtFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Court;
}

export function CourtFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: CourtFormModalProps) {
  const [formData, setFormData] = useState<Partial<Court>>(
    initialData || { name: "", is_indoor: true, status: "available" }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(undefined);

    try {
      if (initialData?.id) {
        await updateCourt(initialData.id, formData);
      } else {
        await createCourt(formData as Court);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save court");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Modal
      isOpen={isOpen}
      title={initialData ? "Edit Court" : "Add New Court"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <FormField label="Court Name" required>
          <TextInput
            name="name"
            value={formData.name || ""}
            onChange={handleChange}
            placeholder="e.g., Court A1"
            required
          />
        </FormField>

        <FormField label="Court Type" required>
          <SelectInput
            name="is_indoor"
            value={formData.is_indoor ? "true" : "false"}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                is_indoor: e.target.value === "true",
              }))
            }
            options={[
              { value: "true", label: "Indoor" },
              { value: "false", label: "Outdoor" },
            ]}
            required
          />
        </FormField>

        <FormField label="Status" required>
          <SelectInput
            name="status"
            value={formData.status || ""}
            onChange={handleChange}
            options={[
              { value: "available", label: "Available" },
              { value: "booked", label: "Booked" },
              { value: "maintenance", label: "Maintenance" },
            ]}
            required
          />
        </FormField>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-foreground hover:bg-card-hover transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {loading ? "Saving..." : "Save Court"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
