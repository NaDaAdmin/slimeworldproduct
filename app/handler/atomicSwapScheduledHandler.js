import atomicSwapScheduledRequest from "app/validators/atomicSwapScheduledRequest"
import Response from "app/response"

async function AtomicSwapScheduledHandler(req, res) {

	// const validationErrors = atomicSwapScheduledRequest(req.body)

	// if (validationErrors) {
	// 	return Response.unprocessibleEntity(res, validationErrors)
	// }


	const { token_id1, token_id2, account_id1, account_id2, serialNum, amount } = req.body
	const atomicPayload = {		
		token_id1,
        token_id2,
		account_id1,
        account_id2,
        serialNum,
		amount
	}
	const { hashgraphClient } = req.context
	const atomicSwapScheduledResponse = await hashgraphClient.atomicSwapScheduled(atomicPayload)

	if (atomicSwapScheduledResponse) {
		return Response.json(res, atomicSwapScheduledResponse)
	}

	// This has to be bolstered up with correct error handling
	return Response.badRequest(res)
}

export default AtomicSwapScheduledHandler
