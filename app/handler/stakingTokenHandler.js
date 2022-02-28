import Response from "app/response"

async function StakingTokenHandler(req, res) {

	const { token_id, sender_id, sender_Key, receiver_id, amount } = req.body
	const stakingPayload = {
		token_id,
		sender_id,
        sender_Key,
		receiver_id,
		amount
	}

	const { hashgraphClient } = req.context
	const stakingResponse = await hashgraphClient.stakingToken(stakingPayload)

	if (stakingResponse) {
		return Response.json(res, stakingResponse)
	}

	// This has to be bolstered up with correct error handling
	return Response.badRequest(res)
}

export default StakingTokenHandler