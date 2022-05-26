import scheduledSignRequest from "app/validators/scheduledSignRequest"
import Response from "app/response"

async function ScheduledSignHandler(req, res) {
	const { scheduledId, scheduledTxId, privateKey } = req.body
	const scheduledSignPayload = {
		scheduledId,
		scheduledTxId,
		privateKey,
	}

	const { hashgraphClient } = req.context
	const scheduledSignResponse = await hashgraphClient.scheduledSign(scheduledSignPayload)

	if (scheduledSignResponse) {
		return Response.json(res, scheduledSignResponse)
	}

	// This has to be bolstered up with correct error handling
	return Response.badRequest(res)
}

export default ScheduledSignHandler
