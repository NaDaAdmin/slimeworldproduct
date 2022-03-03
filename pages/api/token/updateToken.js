import onlyPost from "app/middleware/onlyPost"
import useHashgraphContext from "app/context/useHashgraphContext"
import prepare from "app/utils/prepare"
import UpdateTokenHandler from "app/handler/updateTokenHandler"

export default prepare(
	onlyPost,
	useHashgraphContext
)(UpdateTokenHandler)
