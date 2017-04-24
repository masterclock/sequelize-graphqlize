import { stringify } from 'circular-json';
import * as _ from 'lodash';
import { Associations, Model } from 'sequelize';

import { argsToFindOptions } from './args-to-find-options';

export const findOneResolver = (model: Model<any, any>, options?: any) => {
    return (root: any, args: any, context: any, info: any) => {
        const findOptions = args.filter || {};
        if (Object.keys(args).indexOf('id') >= 0 && args.id !== null) {
            return model.findById(args.id, findOptions);
        } else {
            return model.findOne(findOptions);
        }
    };
};

export const findAllResolver = (model: Model<any, any>, options?: any) => {
    return (root: any, args: any, context: any, info: any) => {
        // console.log('info: ', info);
        const findOptions = argsToFindOptions(args);
        const firstFilter = _.omit(findOptions, ['offset']);
        const lastFilter = _.omit(findOptions, ['offset']);
        return Promise.all([
            model.findOne(firstFilter),
            model.findOne(lastFilter),
            model.findAndCount(findOptions),
        ]).then(([first, last, { rows, count }]) => ({
            first: first,
            last: last,
            list: rows,
            count: count,
        }));
    };
};

export const findBelongsTo = (association: any, options?: any) => {
    console.log('findBelongsTo: ', stringify(association));
    return (root: any, args: any, context: any, info: any) => {
        const model: Model<any, any> = association.target;
        return model.findById(root[association.foreignKey]);
    };
};

export const findHasOne = (association: any, options?: any) => {
    console.log('findHasOne: ', association);
    return (root: any, args: any, context: any, info: any) => {
        const model: Model<any, any> = association.target;
        return model.findById(root[association.foreignKey]);
    };
};

export const findHasMay = (association: any, options?: any) => {
    console.log('findHasMay: ', association);
    return (root: any, args: any, context: any, info: any) => {
        // console.log('findHasMay: ', root);
        const model = association.target;
        args.filter = _.merge({}, args.filter, { where: { customerId: root.id } });
        return findAllResolver(model)(root, args, context, info);
    };
};

export const findBelongsToMany = (association: any, options?: any) => {
    console.log('findBelongsToMany: ', association);
    return (root: any, args: any, context: any, info: any) => {
        return {};
    };
};

export const createResolver = (model: Model<any, any>) => {
    return (root: any, args: any, context: any, info: any) => {
        return model.create(args.data);
    };
};

export const updateResolver = (model: Model<any, any>) => {
    return (root: any, args: any, context: any, info: any) => {
        return model.findById(args.id).then((val) => val.update(args.data));
    };
};

export const deleteResolver = (model: Model<any, any>) => {
    return (root: any, args: any, context: any, info: any) => {
        return model.findById(args.id).then((val) => val.destroy(args.data));
    };
};

export const methodResolver = (model: any, method: any, argsBuilder: any) => {
    console.log('methodResolver: ', model, method);
    if (method.isStatic) {
        const methodInst = model[method.name];
        console.log(Object.keys(model), method);
        return (root: any, args: any, context: any, info: any) => {
            const params = argsBuilder(args, context);
            return methodInst.call(model, ...params);
        };
    } else {
        return (root: any, args: any, context: any, info: any) => {
            if (root instanceof model) {
                const params = argsBuilder(args, context);
                return root[method.name](...params);
            }
        };
    }
};
