import sanitize from 'sanitize-filename';
/** Generate an uuid
* @url https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript#2117523 **/
export function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Helper function to throw an Exception in case an invalid File or Dir name is given
export function checkAndSanitizeFilePathName(path) {
    const newPath = sanitize(path);
    if (newPath !== path) {
        throw 'Given File or Bundlename contains invalid characters.';
    }
    return newPath;
}
