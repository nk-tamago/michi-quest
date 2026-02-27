export const resizeImage = (file, maxDimension = 1024) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // 縦横比を維持しながら最大サイズに収める
                if (width > height) {
                    if (width > maxDimension) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    }
                } else {
                    if (height > maxDimension) {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // JPEG形式で圧縮率80%で出力（Base64 URL）
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = () => reject(new Error('Image calculation failed'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('File reading failed'));
        reader.readAsDataURL(file);
    });
};

/**
 * 画像URL（Base64 または Web URL）から、指定された領域（pixelCrop）を切り出して、
 * さらに targetSize（デフォルト256）に合わせてリサイズし、Base64文字列（JPEG）として返す。
 */
export const getCroppedImg = (imageSrc, pixelCrop, targetSize = 256) => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // 出力キャンバスは正方形サイズを固定する
            canvas.width = targetSize;
            canvas.height = targetSize;

            ctx.drawImage(
                image,
                pixelCrop.x,
                pixelCrop.y,
                pixelCrop.width,
                pixelCrop.height,
                0,
                0,
                targetSize,
                targetSize
            );

            // 高画質JPEGとしてBase64を返す
            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        image.onerror = (e) => reject(new Error('Cropping image failed: ' + e));

        // CORS対応（必要に応じて）
        image.crossOrigin = 'anonymous';
        image.src = imageSrc;
    });
};
