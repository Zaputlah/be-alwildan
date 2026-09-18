import { HttpError } from '../common/http-error.js';
export const validate = (schema, source = 'body') => (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
        next(new HttpError(400, 'VALIDATION_ERROR', 'Data yang dikirim tidak valid.', result.error.flatten()));
        return;
    }
    req[source] = result.data;
    next();
};
