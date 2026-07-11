# Event Report

## Event Contract Status

| Event Type | Publisher | Subscribers | Status |
|---|---|---|---|
| address.archived | address | organization | ✅ pass |
| address.created | address | — | ⚠️ warning |
| address.default.changed | address | — | ⚠️ warning |
| address.deleted | address | — | ⚠️ warning |
| address.normalized | address | — | ⚠️ warning |
| address.restored | address | — | ⚠️ warning |
| address.updated | address | — | ⚠️ warning |
| address.validated | address | — | ⚠️ warning |
| adjustment.created | billing | — | ⚠️ warning |
| asset.archived | media | — | ⚠️ warning |
| asset.audit.recorded | media | — | ⚠️ warning |
| asset.collection.created | media | — | ⚠️ warning |
| asset.created | media | — | ⚠️ warning |
| asset.deleted | media | — | ⚠️ warning |
| asset.reference.attached | media | — | ⚠️ warning |
| asset.reference.detached | media | — | ⚠️ warning |
| asset.restored | media | — | ⚠️ warning |
| asset.transformation.requested | media | — | ⚠️ warning |
| asset.updated | media | — | ⚠️ warning |
| asset.upload.completed | media | — | ⚠️ warning |
| asset.upload.started | media | — | ⚠️ warning |
| asset.variant.created | media | — | ⚠️ warning |
| asset.version.published | media | — | ⚠️ warning |
| auth.2fa.challenge.completed | identity | — | ⚠️ warning |
| auth.2fa.disabled | identity | — | ⚠️ warning |
| auth.2fa.enabled | identity | — | ⚠️ warning |
| auth.account.disabled | identity | — | ⚠️ warning |
| auth.account.locked | identity | — | ⚠️ warning |
| auth.account.unlocked | identity | — | ⚠️ warning |
| auth.captcha.failed | identity | — | ⚠️ warning |
| auth.credentials.created | identity | — | ⚠️ warning |
| auth.credentials.deleted | identity | — | ⚠️ warning |
| auth.email.verified | identity | — | ⚠️ warning |
| auth.identity.added | identity | — | ⚠️ warning |
| auth.identity.removed | identity | — | ⚠️ warning |
| auth.login.failure | identity | — | ⚠️ warning |
| auth.login.partial | identity | — | ⚠️ warning |
| auth.login.success | identity | — | ⚠️ warning |
| auth.logout | identity | — | ⚠️ warning |
| auth.logout.all | identity | — | ⚠️ warning |
| auth.oauth.initiated | identity | — | ⚠️ warning |
| auth.oauth.linked | identity | — | ⚠️ warning |
| auth.oauth.unlinked | identity | — | ⚠️ warning |
| auth.password.changed | identity | — | ⚠️ warning |
| auth.password.reset.completed | identity | — | ⚠️ warning |
| auth.password.reset.requested | identity | — | ⚠️ warning |
| auth.phone.verified | identity | — | ⚠️ warning |
| auth.policy.changed | identity | — | ⚠️ warning |
| auth.provider.config.changed | identity | — | ⚠️ warning |
| auth.rate_limit.exceeded | identity | — | ⚠️ warning |
| auth.register.failure | identity | — | ⚠️ warning |
| auth.register.success | identity | — | ⚠️ warning |
| auth.session.expired | identity | — | ⚠️ warning |
| auth.session.revoked.admin | identity | — | ⚠️ warning |
| auth.session.revoked.user | identity | — | ⚠️ warning |
| auth.suspicious_login.detected | identity | — | ⚠️ warning |
| auth.verification.requested | identity | — | ⚠️ warning |
| authorization.decision.allow | authorization | — | ⚠️ warning |
| authorization.decision.deny | authorization | — | ⚠️ warning |
| authorization.permission.assigned | authorization | — | ⚠️ warning |
| authorization.policy.created | authorization | — | ⚠️ warning |
| authorization.role.assigned | authorization | — | ⚠️ warning |
| authorization.role.created | authorization | — | ⚠️ warning |
| billing.audit.recorded | billing | — | ⚠️ warning |
| billing.created | billing | — | ⚠️ warning |
| billing.updated | billing | — | ⚠️ warning |
| booking.cancelled | — | communication | ❌ fail |
| booking.created | — | communication | ❌ fail |
| bundle.created | catalog | — | ⚠️ warning |
| bundle.deleted | catalog | — | ⚠️ warning |
| bundle.updated | catalog | — | ⚠️ warning |
| catalog.archived | catalog | pricing | ✅ pass |
| catalog.audit.recorded | catalog | — | ⚠️ warning |
| catalog.created | catalog | — | ⚠️ warning |
| catalog.deleted | catalog | — | ⚠️ warning |
| catalog.restored | catalog | — | ⚠️ warning |
| catalog.updated | catalog | — | ⚠️ warning |
| category.created | catalog | — | ⚠️ warning |
| category.deleted | catalog | — | ⚠️ warning |
| category.moved | catalog | — | ⚠️ warning |
| category.updated | catalog | — | ⚠️ warning |
| communication.message.dead_letter | communication | — | ⚠️ warning |
| communication.message.failed | communication | — | ⚠️ warning |
| communication.message.queued | communication | — | ⚠️ warning |
| communication.message.retry_scheduled | communication | — | ⚠️ warning |
| communication.message.sent | communication | — | ⚠️ warning |
| compatibility.scan.completed | platform-compatibility | — | ⚠️ warning |
| compatibility.scan.failed | platform-compatibility | — | ⚠️ warning |
| compatibility.violation.detected | platform-compatibility | — | ⚠️ warning |
| credit.issued | billing | — | ⚠️ warning |
| eventbus.dead_letter | event-bus | — | ⚠️ warning |
| eventbus.subscriber.registered | event-bus | — | ⚠️ warning |
| eventbus.subscriber.unregistered | event-bus | — | ⚠️ warning |
| identity.account.created | — | communication, user | ❌ fail |
| identity.email.verified | — | communication | ❌ fail |
| identity.login.failed | — | communication | ❌ fail |
| identity.login.success | — | communication | ❌ fail |
| identity.password.reset | — | communication | ❌ fail |
| invoice.cancelled | billing | — | ⚠️ warning |
| invoice.closed | billing | — | ⚠️ warning |
| invoice.issued | billing | — | ⚠️ warning |
| invoice.voided | billing | — | ⚠️ warning |
| organization.archived | organization | billing, catalog, media, pricing | ✅ pass |
| organization.audit.recorded | organization | — | ⚠️ warning |
| organization.branch.created | organization | — | ⚠️ warning |
| organization.created | organization | — | ⚠️ warning |
| organization.deleted | organization | billing, catalog, media, pricing | ✅ pass |
| organization.department.created | organization | — | ⚠️ warning |
| organization.department.moved | organization | — | ⚠️ warning |
| organization.member.added | organization | — | ⚠️ warning |
| organization.member.changed | organization | — | ⚠️ warning |
| organization.member.removed | organization | — | ⚠️ warning |
| organization.profile.updated | organization | — | ⚠️ warning |
| organization.restored | organization | — | ⚠️ warning |
| organization.status.changed | organization | — | ⚠️ warning |
| organization.team.created | organization | — | ⚠️ warning |
| organization.team.moved | organization | — | ⚠️ warning |
| organization.type.changed | organization | — | ⚠️ warning |
| organization.updated | organization | — | ⚠️ warning |
| payment.completed | — | communication | ❌ fail |
| payment.failed | — | communication | ❌ fail |
| policy.cache.invalidated | policy | — | ⚠️ warning |
| policy.created | policy | — | ⚠️ warning |
| policy.deleted | policy | — | ⚠️ warning |
| policy.updated | policy | organization | ✅ pass |
| pricing.archived | pricing | — | ⚠️ warning |
| pricing.audit.recorded | pricing | — | ⚠️ warning |
| pricing.catalog.attached | pricing | — | ⚠️ warning |
| pricing.catalog.detached | pricing | — | ⚠️ warning |
| pricing.component.added | pricing | — | ⚠️ warning |
| pricing.component.removed | pricing | — | ⚠️ warning |
| pricing.created | pricing | — | ⚠️ warning |
| pricing.currency.updated | pricing | — | ⚠️ warning |
| pricing.deleted | pricing | — | ⚠️ warning |
| pricing.exchange.updated | pricing | — | ⚠️ warning |
| pricing.plan.archived | pricing | — | ⚠️ warning |
| pricing.plan.created | pricing | — | ⚠️ warning |
| pricing.plan.deleted | pricing | — | ⚠️ warning |
| pricing.plan.restored | pricing | — | ⚠️ warning |
| pricing.plan.updated | pricing | — | ⚠️ warning |
| pricing.restored | pricing | — | ⚠️ warning |
| pricing.tier.created | pricing | — | ⚠️ warning |
| pricing.tier.updated | pricing | — | ⚠️ warning |
| pricing.time.created | pricing | — | ⚠️ warning |
| pricing.time.updated | pricing | — | ⚠️ warning |
| pricing.updated | pricing | — | ⚠️ warning |
| pricing.version.published | pricing | — | ⚠️ warning |
| pricing.version.rollback | pricing | — | ⚠️ warning |
| reference.media.assigned | catalog | — | ⚠️ warning |
| reference.pricing.assigned | catalog | — | ⚠️ warning |
| review.requested | — | communication | ❌ fail |
| system.announcement | — | communication | ❌ fail |
| user.archived | user | organization | ✅ pass |
| user.avatar.changed | user | — | ⚠️ warning |
| user.created | user | organization | ✅ pass |
| user.deleted | — | catalog | ❌ fail |
| user.language.changed | user | — | ⚠️ warning |
| user.preference.updated | user | — | ⚠️ warning |
| user.profile.updated | user | — | ⚠️ warning |
| user.restored | user | — | ⚠️ warning |
| user.tag.added | user | — | ⚠️ warning |
| user.tag.removed | user | — | ⚠️ warning |
| user.timezone.changed | user | — | ⚠️ warning |
| user.updated | user | — | ⚠️ warning |
| variant.created | catalog | — | ⚠️ warning |
| variant.deleted | catalog | — | ⚠️ warning |
| variant.updated | catalog | — | ⚠️ warning |

## Event Flow Graph

```
 →user.deleted→ catalog
 →booking.cancelled→ communication
 →booking.created→ communication
 →identity.account.created→ communication
 →identity.email.verified→ communication
 →identity.login.failed→ communication
 →identity.login.success→ communication
 →identity.password.reset→ communication
 →payment.completed→ communication
 →payment.failed→ communication
 →review.requested→ communication
 →system.announcement→ communication
 →identity.account.created→ user
address →address.archived→ organization
catalog →catalog.archived→ pricing
organization →organization.archived→ billing
organization →organization.deleted→ billing
organization →organization.archived→ catalog
organization →organization.deleted→ catalog
organization →organization.archived→ media
organization →organization.deleted→ media
organization →organization.archived→ pricing
organization →organization.deleted→ pricing
policy →policy.updated→ organization
user →user.archived→ organization
user →user.created→ organization
```
