import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";

export interface MeResponse {
  id: string;
  email: string;
  displayName: string;
}

export const api = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
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
    }),
  }),
});

export const { useGetMeQuery, useLoginMutation, useRegisterMutation, useLogoutMutation } = api;