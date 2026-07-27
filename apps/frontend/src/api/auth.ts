import { api } from "./client";

export const getCurrentUser = async (
  accessToken: string
) => {
  const response = await api.get(
    "/api/v1/auth/me",
    {
      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
    }
  );

  return response.data;
};