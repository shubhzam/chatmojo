import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";

export interface MeResponse {
  id: string;
  email: string;
  displayName: string;
}

export interface UserSummary {
  id: string;
  email: string;
  displayName: string;
}

export interface DMConversation {
  id: string;
  otherUser: UserSummary;
  lastMessageAt: string;
}

export interface DMMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface MessagePage {
  messages: DMMessage[];
  nextCursor: string | null;
}

export interface GroupSummary {
  id: string;
  name: string;
  createdBy: string;
  lastMessageAt: string;
  memberCount: number;
}

export interface GroupMessage {
  id: string;
  groupConversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface GroupMessagePage {
  messages: GroupMessage[];
  nextCursor: string | null;
}

export interface GroupMember {
  userId: string;
  email: string;
  displayName: string;
  joinedAt: string;
}

export const api = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Conversations", "DMMessages", "Groups", "GroupMessages", "GroupMembers"],
  endpoints: (builder) => ({
    getMe: builder.query<MeResponse, void>({
      query: () => "/auth/me",
    }),
    login: builder.mutation<MeResponse, { email: string; password: string }>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
    }),
    register: builder.mutation<MeResponse, { email: string; password: string; displayName: string }>({
      query: (body) => ({ url: "/auth/register", method: "POST", body }),
    }),
    logout: builder.mutation<{ ok: boolean }, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await queryFulfilled;
        dispatch(api.util.resetApiState());
      },
    }),

    searchUsers: builder.query<UserSummary[], string>({
      query: (q) => `/users/search?q=${encodeURIComponent(q)}`,
    }),

    getConversations: builder.query<DMConversation[], void>({
      query: () => "/conversations",
      providesTags: ["Conversations"],
    }),
    getConversationMessages: builder.query<MessagePage, { conversationId: string; cursor?: string }>({
      query: ({ conversationId, cursor }) =>
        `/conversations/${conversationId}/messages${cursor ? `?cursor=${cursor}` : ""}`,
      providesTags: (_result, _error, arg) => [{ type: "DMMessages", id: arg.conversationId }],
    }),
    sendMessage: builder.mutation<DMMessage, { recipientId: string; content: string }>({
      query: (body) => ({ url: "/messages", method: "POST", body }),
      invalidatesTags: (result) =>
        result ? [{ type: "DMMessages", id: result.conversationId }, "Conversations"] : ["Conversations"],
    }),

    getGroups: builder.query<GroupSummary[], void>({
      query: () => "/groups",
      providesTags: ["Groups"],
    }),
    getGroupMessages: builder.query<GroupMessagePage, { groupId: string; cursor?: string }>({
      query: ({ groupId, cursor }) => `/groups/${groupId}/messages${cursor ? `?cursor=${cursor}` : ""}`,
      providesTags: (_result, _error, arg) => [{ type: "GroupMessages", id: arg.groupId }],
    }),
    sendGroupMessage: builder.mutation<GroupMessage, { groupId: string; content: string }>({
      query: ({ groupId, content }) => ({ url: `/groups/${groupId}/messages`, method: "POST", body: { content } }),
      invalidatesTags: (result) =>
        result ? [{ type: "GroupMessages", id: result.groupConversationId }, "Groups"] : ["Groups"],
    }),
    createGroup: builder.mutation<
      { id: string; name: string; createdBy: string; memberIds: string[]; createdAt: string },
      { name: string; memberIds: string[] }
    >({
      query: (body) => ({ url: "/groups", method: "POST", body }),
      invalidatesTags: ["Groups"],
    }),
    getGroupMembers: builder.query<GroupMember[], string>({
      query: (groupId) => `/groups/${groupId}/members`,
      providesTags: (_result, _error, groupId) => [{ type: "GroupMembers", id: groupId }],
    }),
    addGroupMember: builder.mutation<{ groupId: string; userId: string; joinedAt: string }, { groupId: string; userId: string }>({
      query: ({ groupId, userId }) => ({ url: `/groups/${groupId}/members`, method: "POST", body: { userId } }),
      invalidatesTags: (_result, _error, arg) => [{ type: "GroupMembers", id: arg.groupId }, "Groups"],
    }),
    leaveGroup: builder.mutation<{ ok: boolean }, string>({
      query: (groupId) => ({ url: `/groups/${groupId}/leave`, method: "POST" }),
      invalidatesTags: ["Groups"],
    }),
  }),
});

export const {
  useGetMeQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useSearchUsersQuery,
  useLazySearchUsersQuery,
  useGetConversationsQuery,
  useGetConversationMessagesQuery,
  useLazyGetConversationMessagesQuery,
  useSendMessageMutation,
  useGetGroupsQuery,
  useGetGroupMessagesQuery,
  useLazyGetGroupMessagesQuery,
  useSendGroupMessageMutation,
  useCreateGroupMutation,
  useGetGroupMembersQuery,
  useAddGroupMemberMutation,
  useLeaveGroupMutation,
} = api;
