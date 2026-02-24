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
            img.onerror = (error) => reject(new Error('Image calculation failed'));
            img.src = e.target.result;
        };
        reader.onerror = (error) => reject(new Error('File reading failed'));
        reader.readAsDataURL(file);
    });
};
