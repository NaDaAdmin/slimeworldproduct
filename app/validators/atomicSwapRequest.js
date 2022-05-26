const Joi = require("@hapi/joi")

const schema = Joi.object({
	encrypted_receiver_key: Joi.string()
    .length(241)
    .required(),
    token_id1: Joi.string().required(),
    token_id2: Joi.string().required(),
    account_id1: Joi.string().required(),
    account_id2: Joi.string().required(),
    serialNum: Joi.number().required(),
    amount: Joi.number().required()
})

function consensusMessageRequest(candidate = {}) {
	const validation = schema.validate(candidate || {})

	if (validation.error) {

		return validation.error.details.map(error => error.message)
	}
}

export default consensusMessageRequest
