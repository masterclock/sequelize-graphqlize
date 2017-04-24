// import { toGlobalId } from 'graphql-relay';

const PREFIX = 'PREFIX';

const base64 = (i: string) => {
    return (new Buffer(i, 'ascii')).toString('base64');
};

const unbase64 = (i: string) => {
    return (new Buffer(i, 'base64')).toString('ascii');
};

/**
 * Creates the cursor string from an offset.
 * @param {String} id the id to convert
 * @returns {String}   an opaque cursor
 */
export const idToCursor = (id: string) => {
    return base64(PREFIX + id);
};

/**
 * Rederives the offset from the cursor string.
 * @param {String} cursor   the cursor for conversion
 * @returns {String} id   converted id
 */
export const cursorToId = (cursor: string) => {
    return unbase64(cursor).substring(PREFIX.length);
};

const getId = (cursor: string) => {
    if (cursor === undefined || cursor === null) {
        return null;
    }
    return cursorToId(cursor);
};

export const cursorFromInstance = (instance: any, typeName: string) => {
    return base64(typeName + instance.id);
};

export const cursorToWhere = (cursor: string, typeName: string) => {
    return unbase64(cursor).substring(typeName.length);
};
