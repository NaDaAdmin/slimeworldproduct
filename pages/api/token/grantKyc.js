import onlyPost from "app/middleware/onlyPost"
import useHashgraphContext from "app/context/useHashgraphContext"
import prepare from "app/utils/prepare"
import GrantKycHandler from "app/handler/grantKycHandler"

export default prepare(
	onlyPost,
	useHashgraphContext
)(GrantKycHandler)
