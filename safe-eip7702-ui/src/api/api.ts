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

export const checkRPCStatus = async (rpcUrl: string): Promise<boolean> => {
  
  const data = {
    "jsonrpc": "2.0",
    "id": "1",
    "method": "eth_chainId",
    "params": null
  }

  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();

    // Check if there's a result in the response
    if (json.result) {
      return true;
    } else {
      console.log("Error in RPC response:", json.error || "Unknown error");
      return false;
    }
  } catch (error) {
    console.error("Failed to connect to the Ethereum RPC:", error);
    return false;
  }
}