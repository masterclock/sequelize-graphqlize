import * as _ from 'lodash';

import { methodResolver } from './resolvers';

interface AcceptFunc {
    fromRoot?: (obj: any) => any;
    fromArg?: (obj: any) => any;
    fromContext?: (obj: any) => any;
}

export interface MethodAccept {
    arg: string;
    type: string;
}

export interface MethodReturn {
    root?: boolean;
    arg?: string;
    type: string;
}

export interface Method {
    name: string;
    isStatic: boolean;
    accepts: MethodAccept[];
    returns: MethodReturn[];
    graphQL?: any;
    notes?: string | object;
}

export interface MethodOptions {
    name?: string;
    asProperty?: boolean;
    singular?: boolean;
    modelOptions: any;
}

const exchangeTypes: any = {
    any: 'JSON',
    Any: 'JSON',
    Number: 'Int',
    number: 'Int',
    Object: 'JSON',
    object: 'JSON',
};

const SCALARS: any = {
    any: 'JSON',
    number: 'Float',
    string: 'String',
    boolean: 'Boolean',
    objectid: 'ID',
    date: 'Date',
    object: 'JSON',
    now: 'Date',
    guid: 'ID',
    uuid: 'ID',
    uuidv4: 'ID',
};

const getOptions = (notes: string | object): any => {
    if (!notes) {
        return {};
    }
    if (typeof notes === 'string') {
        try {
            notes = JSON.parse(notes);
        } catch (error) {
            return {};
        }
    }
    return _.get(notes, 'graphQL') || {};
};

const buildOptions = (method: Method, modelOptions: any): MethodOptions => {
    const options = method.graphQL || getOptions(method.notes);
    if (!options.singular) {
        if (options.isStatic) {
            options.singular = false;
        } else {
            options.singular = true;
        }
    }
    const defaultOptions = {};
    return _.merge(defaultOptions, options, {modelOptions: modelOptions});
};

const buildArgsMap = (method: { accepts: any[], isStatic: boolean }) => {
    let accepts;
    if (!method.isStatic) {
        accepts = [{ arg: 'id', type: 'string', graphql: { gqlType: 'ID!' } }, ...method.accepts];
    } else {
        accepts = method.accepts;
    }
    if ((method as any).name === 'data') {
        console.log(accepts);
    }
    return accepts.filter((accept: any) => {
        const options = accept.graphql || {};
        if (options.omit === true) {
            return false;
        }
        return true;
    }).map((accept: any) => {
        const options = accept.graphql || {};
        if (options.fromRoot) {
            // omit this value from the arg list
            switch (typeof options.fromRoot) {
                case 'boolean': {
                    return { fromRoot: (root: any) => _.get(root, accept.arg) };
                }
                case 'string': {
                    return { fromRoot: (root: any) => _.get(root, options.fromRoot) };
                }
                case 'function': {
                    return { fromRoot: (root: any) => options.fromRoot(root) };
                }
                default: {
                    throw new Error(`invalid fromRoot type: ${options.fromRoot}`);
                }
            }
        } else {
            if (typeof accept.http === 'function' && accept.http.name === 'createOptionsViaModelMethod') {
                const arg: any = {
                    fromContext: (context: any) => context,
                };
                return arg;
            } else {
                const arg: any = {
                    fromArg: (args: any) => {
                        const result = _.get(args, accept.arg);
                        // object type from args lacks of constructor, which causes loopback throws an exeception
                        if (typeof result === 'object' && !Array.isArray(result)) {
                            return Object.assign({}, result);
                        } else {
                            return result;
                        }
                    },
                };
                if (options.gqlName) {
                    arg.arg = options.gqlName;
                } else {
                    arg.arg = accept.arg;
                }
                if (options.gqlType) {
                    arg.type = options.gqlType;
                } else {
                    if (accept.type === 'object') {
                        arg.type = 'JSON';
                    } else {
                        if (Array.isArray(accept.type)) {
                            let elemType = accept.type[0];
                            if (!elemType) {
                                elemType = 'JSON';
                            }
                            if (!SCALARS[elemType.toLowerCase()]) {
                                arg.type = `[${elemType}Input]`;
                            } else {
                                arg.type = `[${_.upperFirst(elemType)}]`;
                            }
                        } else {
                            if (!SCALARS[accept.type.toLowerCase()]) {
                                arg.type = `${accept.type}Input`;
                            } else {
                                arg.type = _.upperFirst(accept.type);
                            }
                        }
                    }
                }
                return arg;
            }
        }
    });
};

const buildArgs = (args: MethodAccept[]) => {
    return args.filter((arg) => (!!arg.type) && (!!arg.arg))
        .reduce((result: string, arg) => {
            const opt = `${arg.arg}: ${exchangeTypes[arg.type] || arg.type}`;
            if (result.length) {
                return result + ', ' + opt;
            } else {
                return opt;
            }
        }, '');
};

const getMethodParams = (accepts: AcceptFunc[], args: any, context: any, obj?: any) => {
    return accepts.map((accept) => {
        if (accept.fromRoot) {
            return accept.fromRoot(obj);
        } else if (accept.fromArg) {
            return accept.fromArg(args);
        } else if (accept.fromContext) {
            return accept.fromContext(context);
        } else {
            return undefined;
        }
    });
};

const getReturnType = (returns: MethodReturn[], options: any) => {
    if (options.returnType) {
        return options.returnType;
    }
    if (returns && returns[0].root) {
        const type = returns[0].type;
        if (!SCALARS[type] && typeof type !== 'object') {
            return ``;
        } else {
            return 'JSON';
        }
    } else {
        return 'JSON';
    }
};

export const mapMethods = (methods: Method[], modelOptions: any) => {
    const types: any = {};
    methods.forEach((method) => {
        // let acceptingParams = '';
        const options = buildOptions(method, modelOptions);
        const accepts = buildArgsMap(method);
        const returnType = getReturnType(method.returns, options);
        let targets: string[];
        const asProperty = options.asProperty;
        const name = generateMethodName(method, options);
        let resolver: (root: any, args: any, context: any, info: any) => any;
        if (asProperty) {
            targets = [modelOptions.typeName];
            // resolver = (obj: any, args: any, context: any) => {
            //     const params = getMethodParams(accepts, args, context, obj);
            //     return execution.callRemoteMethod(model, method, params, context, options);
            // };
            // resolver = methodResolver(model, method, argsBuilder);
        } else {
            targets = ['Mutation'];
            // resolver = (rootValue: any, args: any, context: any) => {
            //     const params = getMethodParams(accepts, args, context);
            //     return execution.callRemoteMethod(model, method, params, context, options);
            // };
            const argsBuilder = (args: any, context: any) => {
                const params = getMethodParams(accepts, args, context);
                return params;
            };
            resolver = methodResolver(modelOptions.model, method, argsBuilder);
        }
        targets.forEach((type) => {
            if (!types[type]) {
                types[type] = {fields: {}};
            }
            types[type].fields[name] = {
                relation: true,
                args: buildArgs(accepts),
                gqlType: `${exchangeTypes[returnType] || returnType}`,
                resolver: resolver,
            };
        });
    });
    return types;
};

const generateMethodName = (method: Method, options: MethodOptions) => {
    const name = options.name || method.name;
    if (options.asProperty) {
        return name;
    } else {
        if (options.singular) {
            return `${options.modelOptions.typeName}${_.capitalize(name)}`;
        } else {
            return `${options.modelOptions.pluralTypeName}${_.capitalize(name)}`;
        }
    }
};
