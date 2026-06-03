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

export type ListQuery = {
  page?: number;
  page_size?: number;
  search?: string;
};
