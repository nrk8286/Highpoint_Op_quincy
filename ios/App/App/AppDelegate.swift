import UIKit
import Capacitor
import SupportSDK
import ZendeskCoreSDK
import SDKConfigurations

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private let zendeskUrl = "https://highpointresidency.zendesk.com"
    private let zendeskAppId = "9a66f9cb6200f60842f75e3758a19dab462ce5c2155620df"
    private let zendeskClientId = "mobile_sdk_client_ab7534aebd5fc2aeae9f"
    private var zendeskInitialized = false

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        initializeZendesk()
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state if it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        if handleZendeskURL(url) {
            return true
        }

        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    private func initializeZendesk() {
        guard !zendeskInitialized else {
            return
        }

        Zendesk.initialize(appId: zendeskAppId, clientId: zendeskClientId, zendeskUrl: zendeskUrl)
        Support.initialize(withZendesk: Zendesk.instance)
        zendeskInitialized = true
    }

    private func handleZendeskURL(_ url: URL) -> Bool {
        guard url.scheme?.lowercased() == "highpointops", url.host?.lowercased() == "zendesk" else {
            return false
        }

        initializeZendesk()

        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        let action = queryValue(named: "action", from: components) ?? "support"
        let category = queryValue(named: "category", from: components) ?? "bug"
        let name = queryValue(named: "name", from: components) ?? ""
        let email = queryValue(named: "email", from: components) ?? ""

        Zendesk.instance?.setIdentity(identityFor(name: name, email: email))

        DispatchQueue.main.async { [weak self] in
            guard let self else { return }

            switch action.lowercased() {
            case "requests":
                self.present(self.navigationControllerFor(RequestUi.buildRequestList()))
            case "help-center":
                let config = self.requestConfiguration(for: category)
                self.present(self.navigationControllerFor(HelpCenterUi.buildHelpCenterOverviewUi(withConfigs: [config])))
            default:
                let config = self.requestConfiguration(for: category)
                self.present(self.navigationControllerFor(RequestUi.buildRequestUi(with: [config])))
            }
        }

        return true
    }

    private func identityFor(name: String, email: String) -> Identity {
        return Identity.createAnonymous(name: name.isEmpty ? nil : name, email: email.isEmpty ? nil : email)
    }

    private func requestConfiguration(for category: String) -> RequestUiConfiguration {
        let config = RequestUiConfiguration()
        config.subject = subject(for: category)
        config.tags = tags(for: category)
        return config
    }

    private func subject(for category: String) -> String {
        switch category.lowercased() {
        case "access":
            return "HighPoints access issue"
        case "data":
            return "HighPoints data issue"
        case "question":
            return "HighPoints question"
        default:
            return "HighPoints bug report"
        }
    }

    private func tags(for category: String) -> [String] {
        var tags = ["highpoints", "mobile"]
        switch category.lowercased() {
        case "access":
            tags += ["access", "permission", "role", "rbac"]
        case "data":
            tags += ["data", "sync", "records", "audit"]
        case "question":
            tags += ["question", "how-to"]
        default:
            tags += ["bug", "regression", "login", "session", "ui"]
        }
        return tags
    }

    private func queryValue(named key: String, from components: URLComponents?) -> String? {
        components?.queryItems?.first(where: { $0.name == key })?.value?.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func navigationControllerFor(_ viewController: UIViewController) -> UINavigationController {
        if let nav = viewController as? UINavigationController {
            return nav
        }
        return UINavigationController(rootViewController: viewController)
    }

    private func topViewController(from root: UIViewController?) -> UIViewController? {
        if let presented = root?.presentedViewController {
            return topViewController(from: presented)
        }
        if let navigation = root as? UINavigationController {
            return topViewController(from: navigation.visibleViewController)
        }
        if let tabBar = root as? UITabBarController {
            return topViewController(from: tabBar.selectedViewController)
        }
        return root
    }

    private func present(_ controller: UIViewController) {
        DispatchQueue.main.async {
            let presentingController = self.topViewController(from: self.window?.rootViewController)
                ?? self.window?.rootViewController

            guard let presentingController else {
                return
            }

            presentingController.present(controller, animated: true)
        }
    }
}
