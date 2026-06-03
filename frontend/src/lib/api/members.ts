import { request, requestWithoutBody } from "@/lib/api/http";
import type {
  ApiListResponse,
  CreateMemberInput,
  EntityId,
  ListQuery,
  Member,
  UpdateMemberInput,
} from "@/lib/api/types";

const MEMBERS_ENDPOINT = "/members/";

type MemberListQuery = ListQuery & {
  is_active?: string;
  membership_tier?: string;
};

export async function listMembers(query: MemberListQuery = {}): Promise<ApiListResponse<Member>> {
  return request<ApiListResponse<Member>>(MEMBERS_ENDPOINT, { query });
}

export async function getMember(memberId: EntityId): Promise<Member> {
  return request<Member>(`${MEMBERS_ENDPOINT}${memberId}/`);
}

export async function createMember(payload: CreateMemberInput): Promise<Member> {
  return request<Member>(MEMBERS_ENDPOINT, {
    method: "POST",
    body: payload,
  });
}

export async function updateMember(memberId: EntityId, payload: UpdateMemberInput): Promise<Member> {
  return request<Member>(`${MEMBERS_ENDPOINT}${memberId}/`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteMember(memberId: EntityId): Promise<void> {
  return requestWithoutBody(`${MEMBERS_ENDPOINT}${memberId}/`, {
    method: "DELETE",
  });
}
