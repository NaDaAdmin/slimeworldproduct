import onlyPost from "app/middleware/onlyPost"
import useHashgraphContext from "app/context/useHashgraphContext"
import prepare from "app/utils/prepare"
import EnableUserAccountHandler from "app/handler/enableUserAccountHandler"

export default prepare(
	onlyPost,
	useHashgraphContext
)(EnableUserAccountHandler)
