import * as _ from 'lodash';
import { FindOptions } from 'sequelize';

export const argsToFindOptions = (args: {[key: string]: any}): FindOptions => {
    if (!args) {
        return {};
    }
    let result: FindOptions = {};
    Object.keys(args).forEach((key) => {
        if (key === 'filter') {
            const filter = args.filter;
            const foptions = Object.keys(filter).reduce<FindOptions>((opts: FindOptions, fkey: keyof FindOptions) => {
                opts[fkey] = filter[fkey];
                return opts;
            }, {});
            result = _.merge({}, result, foptions);
        }
    });
    return result;
};
