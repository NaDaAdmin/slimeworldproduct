import onlyPost from "app/middleware/onlyPost"
import useHashgraphContext from "app/context/useHashgraphContext"
import prepare from "app/utils/prepare"
import grantKycHandler from "app/handler/grantKycHandler"

export default prepare(
	onlyPost,
	useHashgraphContext
)(grantKycHandler)
