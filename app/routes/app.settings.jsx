import { data, useLoaderData, useActionData, useNavigation, Form } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const settings = await db.settings.findUnique({ where: { shop: session.shop } });
  return data({ apiKey: settings?.openaiKey ?? "" });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const openaiKey = formData.get("openaiKey")?.trim();

  if (!openaiKey) return data({ error: "API key required" });

  await db.settings.upsert({
    where: { shop: session.shop },
    update: { openaiKey },
    create: { id: session.shop, shop: session.shop, openaiKey },
  });

  return data({ success: true });
};

export default function Settings() {
  const { apiKey } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const saving = navigation.state === "submitting";

  return (
    <s-page heading="Settings">
      <s-section heading="">
        <Form method="post">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "480px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: 500 }}>OpenAI API Key</label>
              <input
                name="openaiKey"
                type="password"
                placeholder={apiKey ? "••••••••••••••••••••" : "sk-..."}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #c9cccf",
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
              />
              <p style={{ marginTop: "4px", fontSize: "12px", color: "#6d7175" }}>
                Your key is stored securely and used to generate alt text.
              </p>
            </div>
            {actionData?.error && (
              <s-banner tone="critical">{actionData.error}</s-banner>
            )}
            {actionData?.success && (
              <s-banner tone="success">API key saved successfully!</s-banner>
            )}
            <div>
              <s-button variant="primary" type="submit" {...(saving ? { loading: true } : {})}>
                {saving ? "Saving..." : "Save"}
              </s-button>
            </div>
          </div>
        </Form>
      </s-section>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error();
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
