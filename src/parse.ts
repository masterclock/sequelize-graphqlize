import * as graphqlRelay from 'graphql-relay';
import * as _ from 'lodash';
import * as pluralize from 'pluralize';

import { mapMethods, Method } from './map-methods';
import { findAllResolver, findBelongsTo, findBelongsToMany, findHasMay, findOneResolver } from './resolvers';
import { createResolver, deleteResolver, updateResolver } from './resolvers';
import { typeMapper } from './type-mapper';
import { genTypeDefs } from './typedefs';
import { cursorFromInstance, cursorToWhere } from './utils';

export interface Options {
    [key: string]: any;
}

export interface ModelOptions {
    typeName?: string;
    pluralTypeName?: string;
    connectionTypeName?: string;
    sequelizeTypes?: any;
    globalOptions?: Options;
}

export interface AttributeOptions {
    key?: string;
    attributeName?: string;
    modelOptions?: ModelOptions;
    sequelizeTypes?: any;
}

export interface AssociationOptions {
    [key: string]: any;
}

const SINGULAR_ARGS = 'id: ID, filter: FilterInput, options: JSON';
const PAGENATION_ARGS = 'filter: FilterInput, options: JSON';

export const parse = (sequelize: any, options?: any): any => {
    options = options || {};
    options.sequelizeTypes = sequelize.constructor;
    const models = sequelize.models;
    if (!models) {
        return {};
    }
    const initial = {
        pageInfo: {
            category: 'TYPE',
            fields: {
                hasNextPage: {
                    gqlType: 'Boolean',
                    required: true,
                },
                hasPreviousPage: {
                    gqlType: 'Boolean',
                    required: true,
                },
                startCursor: {
                    gqlType: 'String',
                },
                endCursor: {
                    gqlType: 'String',
                },
            },
        },
        Filter: {
            category: 'TYPE',
            input: true,
            name: '',
            fields: {
                where: {
                    gqlType: 'JSON',
                    scalar: true,
                },
                paranoid: {
                    gqlType: 'Boolean',
                    scalar: true,
                },
                include: {
                    gqlType: 'JSON',
                    scalar: true,
                },
                order: {
                    gqlType: 'JSON',
                    scalar: true,
                },
                after: {
                    gqlType: 'String',
                    scalar: true,
                },
                before: {
                    gqlType: 'String',
                    scalar: true,
                },
                first: {
                    gqlType: 'Int',
                    scalar: true,
                },
                last: {
                    gqlType: 'Int',
                    scalar: true,
                },
            },
        },
    };
    const types = Object.keys(models).reduce((ast: any, key: string) => {
        const model = models[key];
        const modelOptions = buildModelOptions(model, { key: key, ...options });
        return _.merge(ast, parseModel(model, modelOptions));
    }, initial);
    console.log(JSON.stringify(types));
    console.log(genTypeDefs(types));
    return types;
};

const buildModelOptions = (model: any, options: any): ModelOptions => {
    return {
        sequelizeTypes: options.sequelizeTypes,
        globalOptions: options,
    };
};

const parseModel = (model: any, options: any) => {
    if (model.name === 'User') {
        console.log(model.graphQL);
    }
    const ast = {
        Query: {
            category: 'TYPE',
            fields: {},
        },
        Mutation: {
            category: 'TYPE',
            fields: {},
        },
        Subscription: {
            category: 'TYPE',
            fields: {},
        },
    };
    return _.merge({}, ast,
        mapRoot(model, options),
        mapAttributes(model, options),
        mapConnection(model, options),
        mapAssociations(model, options),
    );
};

const mapRoot = (model: any, options: any) => {
    const typeName = genModelTypeName(model, options);
    const pluralTypeName = genPluralModelTypeName(model, options);
    const connectionTypeName = genConnectionModelTypeName(model, options);
    let ast = {
        Query: {
            fields: {
                [typeName]: {
                    args: SINGULAR_ARGS,
                    root: true,
                    gqlType: typeName,
                    resolver: findOneResolver(model, {}),
                },
                [pluralTypeName]: {
                    args: PAGENATION_ARGS,
                    root: true,
                    gqlType: connectionTypeName,
                    resolver: findAllResolver(model),
                },
            },
        },
        Subscription: {
            fields: {
                [typeName]: {
                    args: SINGULAR_ARGS,
                    root: true,
                    gqlType: typeName,
                    resolver: findOneResolver(model, {}),
                },
                [pluralTypeName]: {
                    args: PAGENATION_ARGS,
                    root: true,
                    gqlType: connectionTypeName,
                    resolver: findAllResolver(model),
                },
            },
        },
        Mutation: {
            fields: {
                [`${typeName}Create`]: {
                    relation: true,
                    args: `data: JSON!`,
                    gqlType: typeName,
                    resolver: createResolver(model),
                },
                [`${typeName}Update`]: {
                    relation: true,
                    args: `id: ID!, data: JSON!`,
                    gqlType: typeName,
                    resolver: updateResolver(model),
                },
                [`${typeName}Delete`]: {
                    relation: true,
                    args: `id: ID!`,
                    gqlType: typeName,
                    resolver: deleteResolver(model),
                },
            },
        },
    };
    const methods = _.get<Method[]>(model, 'graphQL.methods');
    if (methods) {
        ast = _.merge({}, ast, mapMethods(methods, {
            model: model,
            typeName: typeName,
            pluralTypeName: pluralTypeName,
            ...options,
        }));
    }
    return ast;
};

const buildAttributeOptions = (attribute: any, options: any): AttributeOptions => {
    return {
        sequelizeTypes: options.sequelizeTypes,
        modelOptions: options,
    };
};

const mapAttributes = (model: any, options: any) => {
    const attributes = model.rawAttributes;
    const modelTypeName = genModelTypeName(model, options);
    return Object.keys(attributes).reduce((ast: any, key: string) => {
        const attribute = attributes[key];
        const attributeOptions = buildAttributeOptions(attribute, options);
        return _.merge({
            [modelTypeName]: {
                category: 'TYPE',
            },
        }, ast, mapAttribute(model, attribute, { key: key, ...attributeOptions }));
    }, {});
};

const mapAttribute = (model: any, attribute: any, options: any) => {
    const modelTypeName = genModelTypeName(model, options.modelOptions);
    const attributeName = genAttributeName(attribute, options);
    const gqlType = typeMapper(attribute.type, options.sequelizeTypes);
    const ast = {
        [modelTypeName]: {
            fields: {
                [attributeName]: {
                    required: true,
                    gqlType: gqlType,
                },
            },
        },
    };
    return ast;
};

const mapConnection = (model: any, options: any) => {
    const typeName = genModelTypeName(model, options);
    const pluralTypeName = genPluralModelTypeName(model, options);
    const connectionTypeName = genConnectionModelTypeName(model, options);
    const edgeTypeName = genEdgeModelTypeName(model, options);
    const ast = {
        [connectionTypeName]: {
            connection: true,
            category: 'TYPE',
            fields: {
                pageInfo: {
                    required: true,
                    gqlType: 'pageInfo',
                    resolver: (root: any, args: any, context: any, info: any) => {
                        return {
                            hasNextPage: false,
                            hasPreviousPage: false,
                            startCursor: cursorFromInstance(root.first, typeName),
                            endCursor: cursorFromInstance(root.first, typeName),
                        };
                    },
                },
                edges: {
                    required: true,
                    list: true,
                    gqlType: edgeTypeName,
                    resolver: (root: any, args: any, context: any, info: any) => {
                        return _.map(root.list, (elem: any) => ({
                            cursor: cursorFromInstance(elem, typeName),
                            node: elem,
                        }));
                    },
                },
                totalCount: {
                    gqlType: 'Int',
                    scalar: true,
                    resolver: (root: any, args: any, context: any, info: any) => {
                        return root.count;
                    },
                },
                [pluralTypeName]: {
                    gqlType: typeName,
                    list: true,
                    resolver: (root: any, args: any, context: any, info: any) => {
                        return root.list;
                    },
                },
            },
            resolver: findAllResolver(model),
        },
        [edgeTypeName]: {
            category: 'TYPE',
            fields: {
                node: {
                    gqlType: typeName,
                },
                cursor: {
                    gqlType: 'String',
                },
            },
        },
    };
    return ast;
};

const mapAssociations = (model: any, options: ModelOptions) => {
    const associations = model.associations;
    return Object.keys(associations).reduce((ast: any, key: string) => {
        const association = associations[key];
        const associationOptions = buildAssociationOptions(association, options);
        return _.merge({}, ast, mapAssociation(association, { key: key, ...associationOptions }));
    }, {});
};

const buildAssociationOptions = (association: any, options: any) => {
    return {
        modelOptions: options,
    };
};

const mapAssociation = (association: any, options: any) => {
    const typeName = genModelTypeName(association.source, options.modelOptions);
    const associationName = genAssociationName(association, options);
    console.log(associationName);
    const type = association.associationType;
    const mapper = associationMappers[type];
    const ast = {
        [typeName]: {
            fields: {
                [associationName]: mapper(association, options),
            },
        },
    };
    return ast;
};

const associationMappers: { [key: string]: (association: any, options: any) => any } = {
    BelongsTo: (association: any, options: any) => {
        return {
            relation: true,
            gqlType: genModelTypeName(association.target, options.modelOptions),
            resolver: findBelongsTo(association),
        };
    },
    HasOne: (association: any, options: any) => {
        return {
            relation: true,
            gqlType: genModelTypeName(association.target, options.modelOptions),
        };
    },
    HasMany: (association: any, options: any) => {
        return {
            relation: true,
            args: PAGENATION_ARGS,
            gqlType: genConnectionModelTypeName(association.target, options.modelOptions),
            resolver: findHasMay(association),
        };
    },
    BelongsToMany: (association: any, options: any) => {
        return {
            relation: true,
            args: PAGENATION_ARGS,
            gqlType: genConnectionModelTypeName(association.target, options.modelOptions),
        };
    },
};

const genModelTypeName = (model: any, options: any) => {
    if (options.typeName) {
        return options.typeName;
    } else {
        return model.name;
    }
};

const genPluralModelTypeName = (model: any, options: any) => {
    const name = model.name;
    const plural = pluralize(name);
    if (plural === name) {
        return plural + 'List';
    } else {
        return plural;
    }
};

const genConnectionModelTypeName = (model: any, options: any) => {
    const name = model.name;
    const plural = pluralize(name);
    return plural + 'Connection';
};

const genEdgeModelTypeName = (model: any, options: any) => {
    const name = model.name;
    return name + 'Edge';
};

const genAttributeName = (attribute: any, options: AttributeOptions) => {
    return options.attributeName || options.key;
};

const genAssociationName = (association: any, options: AssociationOptions) => {
    return _.camelCase(association.as);
};
