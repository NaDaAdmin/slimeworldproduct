import Response from "app/response"

async function GetUserAccountBalanceHandler(req, res) {
	const { hashgraphClient } = req.context

	const accoundid = req.headers["accoundid"]
	const tokenid = req.headers["tokenid"]

	if (accoundid == undefined || tokenid == undefined ) {

		Response.json(res, "Fail GetUserAccountBalanceHandler")
		return;
	}

	const userinfo = {
		accound_id: accoundid,
		token_id: tokenid
	}


	const balance = await hashgraphClient.userAccountBalanceQuery(userinfo)

	Response.json(res, balance)
}

export default GetUserAccountBalanceHandler
