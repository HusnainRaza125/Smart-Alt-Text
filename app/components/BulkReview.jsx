import { useFetcher } from "react-router";
import { useState, useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";

export function BulkReview({ products, onReset }) {
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [altTexts, setAltTexts] = useState({});

  useEffect(() => {
    const initial = {};
    products.forEach(({ node: product }) => {
      product.images.forEach((image) => {
        initial[image.node.id] = image.node.generatedAlt || "";
      });
    });
    setAltTexts(initial);
  }, [products]);

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("All alt texts saved successfully!");
      onReset();
    }
    if (fetcher.data?.error) {
      shopify.toast.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.data?.success, fetcher.data?.error, shopify]);

  const isSaving = fetcher.state !== "idle";
  const totalImages = products.reduce((acc, { node: p }) => acc + p.images.length, 0);

  return (
    <div>
      {/* Top bar */}
      <s-section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <s-text tone="subdued">
            {totalImages} alt text{totalImages !== 1 ? "s" : ""} ready to save
          </s-text>
          <div style={{ display: "flex", gap: "12px" }}>
            <s-button onClick={onReset}>← Back</s-button>
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="saveAll" />
              <input
                type="hidden"
                name="bulkData"
                value={JSON.stringify(
                  products.flatMap(({ node: product }) =>
                    product.images.map((image) => ({
                      productId: product.id,
                      imageId: image.node.id,
                      altText: altTexts[image.node.id] || "",
                    }))
                  )
                )}
              />
              <s-button variant="primary" type="submit" {...(isSaving ? { loading: true } : {})}>
                Save All
              </s-button>
            </fetcher.Form>
          </div>
        </div>
      </s-section>

      {/* Products */}
      {products.map(({ node: product }) => (
        <div key={product.id} style={{
          border: "1px solid #e1e3e5",
          borderRadius: "12px",
          overflow: "hidden",
          marginBottom: "24px",
          background: "#f6f6f7",
        }}>
          {/* Product Header */}
          <div style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e1e3e5",
            background: "#fff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <p style={{ margin: 0, fontWeight: "600", fontSize: "15px", color: "#202223" }}>
                {product.title}
              </p>
              {product.productType && (
                <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#6d7175" }}>
                  {product.productType}
                </p>
              )}
            </div>
            <span style={{
              background: "#f0f0f0",
              borderRadius: "20px",
              padding: "4px 12px",
              fontSize: "12px",
              color: "#6d7175",
            }}>
              {product.images.length} image{product.images.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Images Grid */}
          <div style={{
            padding: "16px",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
          }}>
            {product.images.map((image) => (
              <div key={image.node.id} style={{
                border: "1px solid #e1e3e5",
                borderRadius: "8px",
                overflow: "hidden",
                background: "#fff",
                display: "flex",
                flexDirection: "column",
              }}>
                <img
                  src={image.node.url}
                  alt={altTexts[image.node.id] || ""}
                  style={{ width: "100%", height: "160px", objectFit: "cover" }}
                />
                <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <textarea
                    value={altTexts[image.node.id] || ""}
                    onChange={(e) => setAltTexts((prev) => ({ ...prev, [image.node.id]: e.target.value }))}
                    maxLength={125}
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "8px",
                      fontSize: "13px",
                      border: "1px solid #c9cccf",
                      borderRadius: "6px",
                      resize: "none",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                  <p style={{ fontSize: "11px", color: "#6d7175", margin: 0 }}>
                    {(altTexts[image.node.id] || "").length}/125
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
