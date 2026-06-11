export type EntityId = number;

export type ApiListResponse<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
};

export type CourtStatus = "available" | "booked" | "maintenance";

export type Court = {
  id: EntityId;
  name: string;
  status: CourtStatus;
  is_indoor: boolean;
};

export type CreateCourtInput = {
  name: string;
  status: CourtStatus;
  is_indoor: boolean;
};

export type UpdateCourtInput = Partial<CreateCourtInput>;

export type MembershipTier = "basic" | "premium" | "pro";

export type Member = {
  id: EntityId;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  membership_tier?: MembershipTier;
  is_active?: boolean;
  bookings_count?: number;
  attended_count?: number;
  no_show_count?: number;
  total_fees?: number;
  total_paid?: number;
  total_balance_due?: number;
};

export type CreateMemberInput = {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  membership_tier?: MembershipTier;
  is_active?: boolean;
};

export type UpdateMemberInput = Partial<CreateMemberInput>;

export type BookingStatus = "confirmed" | "waitlist" | "cancelled";

export type Booking = {
  id: EntityId;
  court: EntityId;
  member: EntityId;
  start_time: string;
  end_time: string;
  players_count: number;
  fee_amount: number;
  is_paid: boolean;
  paid_at?: string | null;
  status: BookingStatus;
  attended?: boolean;
  no_show?: boolean;
  total_paid_amount?: number;
  balance_due?: number;
  payment_progress_status?: PaymentStatus;
};

export type BookingTimeline = {
  id: EntityId;
  court: Court;
  start_time: string;
  end_time: string;
  players_count: number;
  fee_amount: number;
  is_paid: boolean;
  paid_at?: string | null;
  status: BookingStatus;
  attended: boolean;
  no_show: boolean;
  created_at: string;
};

export type CreateBookingInput = {
  court: EntityId;
  member: EntityId;
  start_time: string;
  end_time: string;
  players_count: number;
  fee_amount: number;
  is_paid?: boolean;
  paid_at?: string | null;
  status: BookingStatus;
};

export type UpdateBookingInput = Partial<CreateBookingInput>;

export type BookingAvailabilityCourt = {
  id: EntityId;
  name: string;
};

export type BookingAvailabilitySlot = {
  start_time: string;
  end_time: string;
  available_courts: BookingAvailabilityCourt[];
};

export type BookingAvailabilityResponse = {
  date: string;
  duration_hours: number;
  players_count: number | null;
  slots: BookingAvailabilitySlot[];
};

export type PaymentMethod = "cash" | "bank_transfer" | "ewallet" | "card";

export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded" | "void";

export type Payment = {
  id: EntityId;
  booking: EntityId;
  method: PaymentMethod;
  reference: string;
  amount: number;
  status: PaymentStatus;
  paid_by?: EntityId | null;
  paid_by_username?: string | null;
  payment_date: string;
  created_at: string;
  updated_at: string;
};

export type CreatePaymentInput = {
  booking: EntityId;
  method: PaymentMethod;
  reference?: string;
  amount: number;
  status: PaymentStatus;
  payment_date?: string;
};

export type UpdatePaymentInput = Partial<CreatePaymentInput>;

export type ListQuery = {
  page?: number;
  page_size?: number;
  search?: string;
};

export type RevenuePeriod = "7d" | "30d" | "90d";

export type RevenueByMethod = {
  method: string;
  total: number;
  count: number;
};

export type RevenueByStatus = {
  status: string;
  total: number;
  count: number;
};

export type RevenueDailyPoint = {
  date: string;
  total: number;
  count: number;
};

export type RevenueReport = {
  period: RevenuePeriod;
  period_start: string;
  period_end: string;
  total_revenue: number;
  total_refunded: number;
  net_revenue: number;
  total_transactions: number;
  by_method: RevenueByMethod[];
  by_status: RevenueByStatus[];
  daily_trend: RevenueDailyPoint[];
};
