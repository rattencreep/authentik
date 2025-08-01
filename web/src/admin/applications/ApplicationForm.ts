import "#admin/applications/ProviderSelectModal";
import "#components/ak-file-input";
import "#components/ak-radio-input";
import "#components/ak-slug-input";
import "#components/ak-switch-input";
import "#components/ak-text-input";
import "#components/ak-textarea-input";
import "#elements/Alert";
import "#elements/forms/FormGroup";
import "#elements/forms/HorizontalFormElement";
import "#elements/forms/ModalForm";
import "#elements/forms/ProxyForm";
import "#elements/forms/Radio";
import "#elements/forms/SearchSelect/ak-search-select";
import "@patternfly/elements/pf-tooltip/pf-tooltip.js";
import "./components/ak-backchannel-input.js";
import "./components/ak-provider-search-input.js";

import { DEFAULT_CONFIG } from "#common/api/config";

import { ModelForm } from "#elements/forms/ModelForm";
import { CapabilitiesEnum, WithCapabilitiesConfig } from "#elements/mixins/capabilities";

import { iconHelperText } from "#admin/helperText";
import { policyEngineModes } from "#admin/policies/PolicyEngineModes";

import { Application, CoreApi, Provider } from "@goauthentik/api";

import { msg } from "@lit/localize";
import { html, nothing, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";

@customElement("ak-application-form")
export class ApplicationForm extends WithCapabilitiesConfig(ModelForm<Application, string>) {
    constructor() {
        super();
        this.handleConfirmBackchannelProviders = this.handleConfirmBackchannelProviders.bind(this);
        this.makeRemoveBackchannelProviderHandler =
            this.makeRemoveBackchannelProviderHandler.bind(this);
    }

    async loadInstance(pk: string): Promise<Application> {
        const app = await new CoreApi(DEFAULT_CONFIG).coreApplicationsRetrieve({
            slug: pk,
        });
        this.clearIcon = false;
        this.backchannelProviders = app.backchannelProvidersObj || [];
        return app;
    }

    @property({ attribute: false })
    provider?: number;

    @state()
    backchannelProviders: Provider[] = [];

    @property({ type: Boolean })
    clearIcon = false;

    getSuccessMessage(): string {
        return this.instance
            ? msg("Successfully updated application.")
            : msg("Successfully created application.");
    }

    async send(data: Application): Promise<Application | void> {
        let app: Application;
        data.backchannelProviders = this.backchannelProviders.map((p) => p.pk);
        if (this.instance) {
            app = await new CoreApi(DEFAULT_CONFIG).coreApplicationsUpdate({
                slug: this.instance.slug,
                applicationRequest: data,
            });
        } else {
            app = await new CoreApi(DEFAULT_CONFIG).coreApplicationsCreate({
                applicationRequest: data,
            });
        }
        if (this.can(CapabilitiesEnum.CanSaveMedia)) {
            const icon = this.files().get("metaIcon");
            if (icon || this.clearIcon) {
                await new CoreApi(DEFAULT_CONFIG).coreApplicationsSetIconCreate({
                    slug: app.slug,
                    file: icon,
                    clear: this.clearIcon,
                });
            }
        } else {
            await new CoreApi(DEFAULT_CONFIG).coreApplicationsSetIconUrlCreate({
                slug: app.slug,
                filePathRequest: {
                    url: data.metaIcon || "",
                },
            });
        }
        return app;
    }

    handleConfirmBackchannelProviders(items: Provider[]) {
        this.backchannelProviders = items;
        this.requestUpdate();
        return Promise.resolve();
    }

    makeRemoveBackchannelProviderHandler(provider: Provider) {
        return () => {
            const idx = this.backchannelProviders.indexOf(provider);
            this.backchannelProviders.splice(idx, 1);
            this.requestUpdate();
        };
    }

    handleClearIcon(ev: Event) {
        ev.stopPropagation();
        if (!(ev instanceof InputEvent) || !ev.target) {
            return;
        }
        this.clearIcon = !!(ev.target as HTMLInputElement).checked;
    }

    renderForm(): TemplateResult {
        const alertMsg = msg(
            "Using this form will only create an Application. In order to authenticate with the application, you will have to manually pair it with a Provider.",
        );

        return html`<form class="pf-c-form pf-m-horizontal">
            ${this.instance ? nothing : html`<ak-alert level="pf-m-info">${alertMsg}</ak-alert>`}
            <ak-text-input
                name="name"
                value=${ifDefined(this.instance?.name)}
                label=${msg("Name")}
                required
                help=${msg("Application's display Name.")}
            ></ak-text-input>
            <ak-slug-input
                name="slug"
                value=${ifDefined(this.instance?.slug)}
                label=${msg("Slug")}
                required
                help=${msg("Internal application name used in URLs.")}
                input-hint="code"
            ></ak-slug-input>
            <ak-text-input
                name="group"
                value=${ifDefined(this.instance?.group)}
                label=${msg("Group")}
                help=${msg(
                    "Optionally enter a group name. Applications with identical groups are shown grouped together.",
                )}
                input-hint="code"
            ></ak-text-input>
            <ak-provider-search-input
                name="provider"
                label=${msg("Provider")}
                value=${ifDefined(this.instance?.provider ?? undefined)}
                help=${msg("Select a provider that this application should use.")}
                blankable
            ></ak-provider-search-input>
            <ak-backchannel-providers-input
                name="backchannelProviders"
                label=${msg("Backchannel Providers")}
                help=${msg(
                    "Select backchannel providers which augment the functionality of the main provider.",
                )}
                .providers=${this.backchannelProviders}
                .confirm=${this.handleConfirmBackchannelProviders}
                .remover=${this.makeRemoveBackchannelProviderHandler}
                .tooltip=${html`<pf-tooltip
                    position="top"
                    content=${msg("Add provider")}
                ></pf-tooltip>`}
            >
            </ak-backchannel-providers-input>
            <ak-radio-input
                label=${msg("Policy engine mode")}
                required
                name="policyEngineMode"
                .options=${policyEngineModes}
                .value=${this.instance?.policyEngineMode}
            ></ak-radio-input>
            <ak-form-group label="${msg("UI settings")}">
                <div class="pf-c-form">
                    <ak-text-input
                        name="metaLaunchUrl"
                        label=${msg("Launch URL")}
                        value=${ifDefined(this.instance?.metaLaunchUrl)}
                        help=${msg(
                            "If left empty, authentik will try to extract the launch URL based on the selected provider.",
                        )}
                        input-hint="code"
                    ></ak-text-input>
                    <ak-switch-input
                        name="openInNewTab"
                        ?checked=${this.instance?.openInNewTab ?? false}
                        label=${msg("Open in new tab")}
                        help=${msg(
                            "If checked, the launch URL will open in a new browser tab or window from the user's application library.",
                        )}
                    >
                    </ak-switch-input>
                    ${this.can(CapabilitiesEnum.CanSaveMedia)
                        ? html`<ak-file-input
                                  label="${msg("Icon")}"
                                  name="metaIcon"
                                  value=${ifDefined(this.instance?.metaIcon ?? undefined)}
                                  current=${msg("Currently set to:")}
                              ></ak-file-input>
                              ${this.instance?.metaIcon
                                  ? html`
                                        <ak-switch-input
                                            name=""
                                            label=${msg("Clear icon")}
                                            help=${msg("Delete currently set icon.")}
                                            @change=${this.handleClearIcon}
                                        ></ak-switch-input>
                                    `
                                  : html``}`
                        : html` <ak-text-input
                              label=${msg("Icon")}
                              name="metaIcon"
                              value=${this.instance?.metaIcon ?? ""}
                              help=${iconHelperText}
                          >
                          </ak-text-input>`}
                    <ak-text-input
                        label=${msg("Publisher")}
                        name="metaPublisher"
                        value="${ifDefined(this.instance?.metaPublisher)}"
                    ></ak-text-input>
                    <ak-textarea-input
                        label=${msg("Description")}
                        name="metaDescription"
                        value=${ifDefined(this.instance?.metaDescription)}
                    ></ak-textarea-input>
                </div>
            </ak-form-group>
        </form>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "ak-application-form": ApplicationForm;
    }
}
