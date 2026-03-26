import { useFetcher } from "react-router";
import { useState, useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";

export function ImageCard({ productId, productTitle, productType, image }) {
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [altText, setAltText] = useState(image.altText || "");

  const isGenerating =
    fetcher.state !== "idle" &&
    fetcher.formData?.get("intent") === "generate";

  const isSaving =
    fetcher.state !== "idle" &&
    fetcher.formData?.get("intent") === "save";

  useEffect(() => {
    if (fetcher.data?.altText) {
      setAltText(fetcher.data.altText);
    }
  }, [fetcher.data?.altText]);

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Alt text saved successfully!");
    }
    if (fetcher.data?.error) {
      shopify.toast.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.data?.success, fetcher.data?.error, shopify]);

  return (
    <s-section>
      <s-stack direction="inline" gap="base" align="start">
        <img
          src={image.url}
          alt={altText}
          style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px" }}
        />
        <s-stack direction="block" gap="tight" style={{ flex: 1 }}>
          <s-text emphasis="bold">{productTitle}</s-text>
          {productType && <s-text tone="subdued">{productType}</s-text>}
        </s-stack>
      </s-stack>

      <s-stack direction="block" gap="base">
        <s-text-field
          label="Alt Text"
          value={altText}
          onInput={(e) => setAltText(e.target.value)}
          multiline="2"
          max-length="125"
          character-count
        />

        <s-stack direction="inline" gap="base">
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="generate" />
            <input type="hidden" name="title" value={productTitle} />
            <input type="hidden" name="productType" value={productType || ""} />
            <input type="hidden" name="imageUrl" value={image.url} />
            <s-button
              variant="primary"
              type="submit"
              {...(isGenerating ? { loading: true } : {})}
            >
              Generate Alt Text
            </s-button>
          </fetcher.Form>

          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="save" />
            <input type="hidden" name="productId" value={productId} />
            <input type="hidden" name="imageId" value={image.id} />
            <input type="hidden" name="altText" value={altText} />
            <s-button
              type="submit"
              {...(isSaving ? { loading: true } : {})}
            >
              Save to Shopify
            </s-button>
          </fetcher.Form>
        </s-stack>
      </s-stack>
    </s-section>
  );
}
