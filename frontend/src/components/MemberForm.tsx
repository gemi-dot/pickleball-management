"use client";

import { useState } from "react";
import { Modal, FormField, TextInput, SelectInput } from "./Form";
import { Member } from "@/lib/api/types";
import { createMember, updateMember } from "@/lib/api/members";

interface MemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Member;
}

export function MemberFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: MemberFormModalProps) {
  const [formData, setFormData] = useState<Partial<Member>>(
    initialData || {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      membership_tier: "basic",
      is_active: true,
    }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(undefined);

    try {
      if (initialData?.id) {
        await updateMember(initialData.id, formData);
      } else {
        await createMember(formData as Member);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save member");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title={initialData ? "Edit Member" : "Add New Member"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="First Name" required>
            <TextInput
              name="first_name"
              value={formData.first_name || ""}
              onChange={handleChange}
              placeholder="John"
              required
            />
          </FormField>

          <FormField label="Last Name" required>
            <TextInput
              name="last_name"
              value={formData.last_name || ""}
              onChange={handleChange}
              placeholder="Doe"
              required
            />
          </FormField>
        </div>

        <FormField label="Email" required>
          <TextInput
            name="email"
            type="email"
            value={formData.email || ""}
            onChange={handleChange}
            placeholder="john@example.com"
            required
          />
        </FormField>

        <FormField label="Phone">
          <TextInput
            name="phone"
            value={formData.phone || ""}
            onChange={handleChange}
            placeholder="(555) 123-4567"
          />
        </FormField>

        <FormField label="Membership Tier" required>
          <SelectInput
            name="membership_tier"
            value={formData.membership_tier || ""}
            onChange={handleChange}
            options={[
              { value: "basic", label: "Basic" },
              { value: "premium", label: "Premium" },
              { value: "pro", label: "Pro" },
            ]}
            required
          />
        </FormField>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            name="is_active"
            checked={formData.is_active !== false}
            onChange={handleChange}
            className="rounded border-line"
          />
          <label className="text-sm font-medium text-foreground">
            Active Member
          </label>
        </div>

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
            {loading ? "Saving..." : "Save Member"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
