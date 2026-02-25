import exifr from 'exifr';

/**
 * 渡された画像ファイルからExifのGPS情報（緯度経度）を抽出する
 * よりモダンで確実な `exifr` ライブラリを使用
 * @param {File} file - 画像ファイル
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
export const getGPSFromImage = async (file) => {
    try {
        console.log("Analyzing image with exifr...");
        // タイムアウトを設定して、無限に待たないようにする
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('exifr parser timeout')), 3000)
        );
        
        // exifr.gps() returns {latitude: 35.xxx, longitude: 139.xxx} directly
        const gps = await Promise.race([
            exifr.gps(file),
            timeoutPromise
        ]);

        console.log("exifr GPS result:", gps);
        
        if (gps && gps.latitude != null && gps.longitude != null) {
            return { lat: gps.latitude, lng: gps.longitude };
        }
        
        return null;
    } catch (e) {
        console.error("EXIF parsing error with exifr:", e);
        return null;
    }
};
