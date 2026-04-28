import { createAppIcon } from "@/app/icon-image";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return createAppIcon(size.width);
}
