const Joi = require("@hapi/joi")

const schema = Joi.object({
    token_id: Joi.string().required(),
    account_id: Joi.string().required(),
    serialNum: Joi.number().required()
})

function consensusMessageRequest(candidate = {}) {
	const validation = schema.validate(candidate || {})

	if (validation.error) {

		return validation.error.details.map(error => error.message)
	}
}

export default consensusMessageRequest
