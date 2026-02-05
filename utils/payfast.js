import crypto from 'crypto';

export const generatePayfastSignature = (data, passphrase = null) => {
    let getString = "";
    Object.keys(data).forEach((key) => {
        if (data[key] !== "") {
            getString += `${key}=${encodeURIComponent(data[key].toString().trim()).replace(/%20/g, "+")}&`;
        }
    });
    let finalString = getString.substring(0, getString.length - 1);
    if (passphrase) {
        finalString += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, "+")}`;
    }
    return crypto.createHash("md5").update(finalString).digest("hex");
};