import { AuthorizationList } from "viem/experimental";

export const relayAuthorization = async (authorizationList: AuthorizationList, initData: string | undefined, from: string): Promise<Response> => {
    const response = await fetch(import.meta.env.VITE_BACKEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
            authorizationList,
            initData,
            from
        }),
      });
    return response;
}