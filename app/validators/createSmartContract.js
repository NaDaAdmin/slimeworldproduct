const Joi = require("@hapi/joi")

const schema = Joi.object({
	encrypted_receiver_key: Joi.string()
		.length(241)
		.required(),
	gas: Joi.string().required(),
	file_id: Joi.string().required(),
})

function consensusMessageRequest(candidate = {}) {
	const validation = schema.validate(candidate || {})

	if (validation.error) {

		return validation.error.details.map(error => error.message)
	}
}

export default consensusMessageRequest
