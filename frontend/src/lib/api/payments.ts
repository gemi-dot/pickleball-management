import { request, requestWithoutBody } from "@/lib/api/http";
import type {
  ApiListResponse,
  CreatePaymentInput,
  EntityId,
  ListQuery,
  Payment,
  UpdatePaymentInput,
} from "@/lib/api/types";

const PAYMENTS_ENDPOINT = "/payments/";

type PaymentListQuery = ListQuery & {
  booking?: EntityId;
  method?: string;
  status?: string;
};

export async function listPayments(query: PaymentListQuery = {}): Promise<ApiListResponse<Payment>> {
  return request<ApiListResponse<Payment>>(PAYMENTS_ENDPOINT, { query });
}

export async function getPayment(paymentId: EntityId): Promise<Payment> {
  return request<Payment>(`${PAYMENTS_ENDPOINT}${paymentId}/`);
}

export async function createPayment(payload: CreatePaymentInput): Promise<Payment> {
  return request<Payment>(PAYMENTS_ENDPOINT, {
    method: "POST",
    body: payload,
  });
}

export async function updatePayment(paymentId: EntityId, payload: UpdatePaymentInput): Promise<Payment> {
  return request<Payment>(`${PAYMENTS_ENDPOINT}${paymentId}/`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deletePayment(paymentId: EntityId): Promise<void> {
  return requestWithoutBody(`${PAYMENTS_ENDPOINT}${paymentId}/`, {
    method: "DELETE",
  });
}
