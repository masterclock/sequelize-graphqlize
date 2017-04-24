import * as _ from 'lodash';

import { baseSchema } from './base-schema';

const genResolversRec = (types: any) => {
    const res = _.reduce(types, (sum: any, type: any, name: string) => {
        if (type.category === 'TYPE') {
            sum[name] = _.reduce(type.fields, (obj: any, field: any, key: string) => {
                // console.log(field);
                const typeName = field.gqlType;
                if (field.resolver) {
                    obj[key] = field.resolver;
                }
                // const thisRes = genResolversRec(type.fields);
                // const thisRes = {};
                // return _.merge(obj, thisRes);
                return obj;
            }, {});
        }
        return sum;
    }, {});
    return res;
};

export const genResolvers = (types: any) => {
    const res = genResolversRec(types);
    // const test = {
    //     MachineDataLeft: {
    //         width: (obj: any, args: any, context: any) => {
    //             console.log('here');
    //             return {
    //                 value: true,
    //                 timestamp: new Date(),
    //             };
    //         },
    //         length: ({
    //             timestamp: 123,
    //             value: false,
    //         }),
    //     },
    //     MachineData: {
    //         left: (obj: any, args: any, context: any) => {
    //             return {};
    //         }
    //     },
    // };
    return _.merge({}, baseSchema.resolvers, res);
};

const genResolversRecCompansion = (types: any) => {
    const res = _.reduce(types, (sum: any, type: any, name: string) => {
        if (type.category === 'TYPE') {
            sum[name] = _.reduce(type.fields, (obj: any, field: any, key: string) => {
                // console.log(field);
                const typeName = field.gqlType;
                if (field.resolver) {
                    if (field.scalar) {
                        // tslint:disable-next-line
                        obj[key] = function () { console.log(typeName, key, arguments); return 0; };
                    } else if (field.list) {
                        // tslint:disable-next-line
                        obj[key] = function (): any[] { console.log(typeName, key, arguments); return []; };
                    } else {
                        // tslint:disable-next-line
                        obj[key] = function () { console.log(typeName, key, arguments); return {}; };
                    }
                }
                return obj;
            }, {});
        }
        return sum;
    }, {});
    return res;
};

export const genResolversCompansion = (types: any) => {
    const res = genResolversRecCompansion(types);
    return _.merge({}, baseSchema.resolvers, res);
};

export const genSetupFunctions = (types: any) => {
    const res = _.reduce(types, (sum: any, type: any, name: string) => {
        if (type.category === 'TYPE') {
            sum[name] = _.reduce(type.fields, (obj: any, field: any, key: string) => {
                // console.log(field);
                if (field.setupFunction) {
                    obj[key] = field.setupFunction;
                }
                return obj;
            }, {});
        }
        return sum;
    }, {});
    return res.Subscription;
};
