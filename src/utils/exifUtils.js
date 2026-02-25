import EXIF from 'exif-js';

export const getGPSFromImage = (file) => {
    return new Promise((resolve) => {
        let isResolved = false;

        // 2秒経っても完了しない場合はタイムアウトとして処理を継続させる
        const timeoutId = setTimeout(() => {
            if (!isResolved) {
                isResolved = true;
                resolve(null);
            }
        }, 2000);

        try {
            EXIF.getData(file, function() {
                if (isResolved) return;
                isResolved = true;
                clearTimeout(timeoutId);

                const lat = EXIF.getTag(this, "GPSLatitude");
                const latRef = EXIF.getTag(this, "GPSLatitudeRef");
                const lng = EXIF.getTag(this, "GPSLongitude");
                const lngRef = EXIF.getTag(this, "GPSLongitudeRef");
                
                if (lat && latRef && lng && lngRef) {
                    try {
                        const latitude = convertDMSToDD(lat, latRef);
                        const longitude = convertDMSToDD(lng, lngRef);
                        resolve({ lat: latitude, lng: longitude });
                    } catch (e) {
                        resolve(null);
                    }
                } else {
                    resolve(null); // GPS info not found
                }
            });
        } catch (e) {
            if (!isResolved) {
                isResolved = true;
                clearTimeout(timeoutId);
                resolve(null);
            }
        }
    });
};

const convertDMSToDD = (dms, ref) => {
    let dd = dms[0] + dms[1] / 60 + dms[2] / 3600;
    if (ref === "S" || ref === "W") {
        dd = dd * -1;
    }
    return dd;
};
