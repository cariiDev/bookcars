locals {
  load_balancer_name       = "${terraform.workspace}-k3s-agent-lb"
  bookcars_frontend_domain = "book-${terraform.workspace}.${var.domain}"
  bookcars_backend_domain  = "api-${terraform.workspace}.${var.domain}"
  bookcars_admin_domain    = "admin-${terraform.workspace}.${var.domain}"
}

variable "domain" {
  type      = string
  sensitive = true
  default   = "carii.org"
}

variable "cloudflare_zone_id" {
  type      = string
  sensitive = true
}

data "digitalocean_loadbalancer" "k3s_agent" {
  name = local.load_balancer_name
}

resource "cloudflare_dns_record" "bookcars_frontend" {
  zone_id = var.cloudflare_zone_id
  name    = local.bookcars_frontend_domain
  ttl     = 1
  type    = "A"
  comment = "for bookcars frontend"
  content = data.digitalocean_loadbalancer.k3s_agent.ip
  proxied = false # IMPORTANT: to set to false the first time
}

resource "cloudflare_dns_record" "bookcars_backend" {
  zone_id = var.cloudflare_zone_id
  name    = local.bookcars_backend_domain
  ttl     = 1
  type    = "A"
  comment = "for bookcars backend/api"
  content = data.digitalocean_loadbalancer.k3s_agent.ip
  proxied = false # IMPORTANT: to set to false the first time
}

resource "cloudflare_dns_record" "bookcars_admin" {
  zone_id = var.cloudflare_zone_id
  name    = local.bookcars_admin_domain
  ttl     = 1
  type    = "A"
  comment = "for bookcars admin"
  content = data.digitalocean_loadbalancer.k3s_agent.ip
  proxied = false # IMPORTANT: to set to false the first time
}
