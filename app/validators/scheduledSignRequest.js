const Joi = require("@hapi/joi")

const schema = Joi.object({
	privateKey: Joi.string()
		.length(241)
		.required(),
    scheduledId: Joi.string().required(),
    scheduledTxId: Joi.string().required()
})

function consensusMessageRequest(candidate = {}) {
	const validation = schema.validate(candidate || {})

	if (validation.error) {
		return validation.error.details.map(error => error.message)
	}
}

export default consensusMessageRequest
