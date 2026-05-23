import "react";

type ModelViewerProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement> & {
    src?: string;
    alt?: string;
    ar?: boolean;
    "ar-modes"?: string;
    "ar-scale"?: string;
    "auto-rotate"?: boolean;
    "camera-controls"?: boolean;
    "shadow-intensity"?: string | number;
    exposure?: string | number;
    "environment-image"?: string;
    poster?: string;
    "touch-action"?: string;
  },
  HTMLElement
>;

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerProps;
    }
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerProps;
    }
  }
}
