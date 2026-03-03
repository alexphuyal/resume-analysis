import Joi from 'joi';

export const scrapeJobSchema = Joi.object({
  url: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
});
