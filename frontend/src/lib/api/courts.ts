import { request, requestWithoutBody } from "@/lib/api/http";
import type {
  ApiListResponse,
  Court,
  CreateCourtInput,
  EntityId,
  ListQuery,
  UpdateCourtInput,
} from "@/lib/api/types";

const COURTS_ENDPOINT = "/courts/";

type CourtListQuery = ListQuery & {
  status?: string;
};

export async function listCourts(query: CourtListQuery = {}): Promise<ApiListResponse<Court>> {
  return request<ApiListResponse<Court>>(COURTS_ENDPOINT, { query });
}

export async function getCourt(courtId: EntityId): Promise<Court> {
  return request<Court>(`${COURTS_ENDPOINT}${courtId}/`);
}

export async function createCourt(payload: CreateCourtInput): Promise<Court> {
  return request<Court>(COURTS_ENDPOINT, {
    method: "POST",
    body: payload,
  });
}

export async function updateCourt(courtId: EntityId, payload: UpdateCourtInput): Promise<Court> {
  return request<Court>(`${COURTS_ENDPOINT}${courtId}/`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteCourt(courtId: EntityId): Promise<void> {
  return requestWithoutBody(`${COURTS_ENDPOINT}${courtId}/`, {
    method: "DELETE",
  });
}
