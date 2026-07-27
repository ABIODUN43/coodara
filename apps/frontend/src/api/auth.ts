import { api } from "./client";

export const getCurrentUser = async (
  accessToken: string
) => {
  const response = await api.get(
    "/auth/me",
    {
      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
    }
  );

  return response.data;
};