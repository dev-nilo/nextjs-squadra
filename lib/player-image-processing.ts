export const processImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const targetWidth = 300;
        const targetHeight = 400;
        const targetRatio = targetWidth / targetHeight;

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve(img.src);
          return;
        }

        const imgRatio = img.width / img.height;

        let renderW, renderH, offsetX, offsetY;

        if (imgRatio > targetRatio) {
          renderH = targetHeight;
          renderW = targetHeight * imgRatio;
          offsetX = (targetWidth - renderW) / 2;
          offsetY = 0;
        } else {
          renderW = targetWidth;
          renderH = targetWidth / imgRatio;
          offsetX = 0;
          offsetY = 0;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, offsetX, offsetY, renderW, renderH);

        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};
