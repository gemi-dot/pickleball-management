import { request, requestWithoutBody } from "@/lib/api/http";
import type {
  ApiListResponse,
  BookingAvailabilityResponse,
  Booking,
  CreateBookingInput,
  EntityId,
  ListQuery,
  UpdateBookingInput,
} from "@/lib/api/types";

const BOOKINGS_ENDPOINT = "/bookings/";

type BookingListQuery = ListQuery & {
  court?: EntityId;
  member?: EntityId;
  start_time_after?: string;
  end_time_before?: string;
};

type BookingAvailabilityQuery = {
  date: string;
  duration_hours: number;
  players_count?: number;
};

export async function listBookings(query: BookingListQuery = {}): Promise<ApiListResponse<Booking>> {
  return request<ApiListResponse<Booking>>(BOOKINGS_ENDPOINT, { query });
}

export async function getBooking(bookingId: EntityId): Promise<Booking> {
  return request<Booking>(`${BOOKINGS_ENDPOINT}${bookingId}/`);
}

export async function createBooking(payload: CreateBookingInput): Promise<Booking> {
  return request<Booking>(BOOKINGS_ENDPOINT, {
    method: "POST",
    body: payload,
  });
}

export async function updateBooking(bookingId: EntityId, payload: UpdateBookingInput): Promise<Booking> {
  return request<Booking>(`${BOOKINGS_ENDPOINT}${bookingId}/`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteBooking(bookingId: EntityId): Promise<void> {
  return requestWithoutBody(`${BOOKINGS_ENDPOINT}${bookingId}/`, {
    method: "DELETE",
  });
}

export async function getBookingAvailability(
  query: BookingAvailabilityQuery
): Promise<BookingAvailabilityResponse> {
  return request<BookingAvailabilityResponse>(`${BOOKINGS_ENDPOINT}availability/`, {
    method: "GET",
    query,
  });
}
