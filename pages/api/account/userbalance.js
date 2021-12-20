import onlyGet from "app/middleware/onlyGet"
import withAuthentication from "app/middleware/withAuthentication"
import useHashgraphContext from "app/context/useHashgraphContext"
import prepare from "app/utils/prepare"
import GetUserAccountBalanceHandler from "app/handler/userAccountBalanceHandler"

export default prepare(
	onlyGet,
	withAuthentication,
	useHashgraphContext
)(GetUserAccountBalanceHandler)
