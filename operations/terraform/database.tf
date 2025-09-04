locals {
  system        = "${terraform.workspace}-bookcars"
  engine        = "mongodb"
  version       = "8"
  size          = terraform.workspace == "dev" ? "db-s-1vcpu-2gb" : "db-s-2vcpu-4gb"
  region        = "sgp1"
  node_count    = terraform.workspace == "dev" ? "1" : "2"
  k3s_agent_tag = "${terraform.workspace}-droplet-k3s-agent"
  vpc_name      = "${terraform.workspace}-vpc"
}

data "digitalocean_vpc" "this" {
  name = local.vpc_name
}

data "digitalocean_tag" "k3s_agent" {
  name = local.k3s_agent_tag
}

resource "digitalocean_database_cluster" "mongodb" {
  name                 = "${local.system}-${local.engine}-cluster"
  engine               = local.engine
  version              = local.version
  size                 = local.size
  region               = local.region
  node_count           = local.node_count
  private_network_uuid = data.digitalocean_vpc.this.id
  project_id           = data.digitalocean_project.this.id
}

resource "digitalocean_database_db" "bookcars" {
  cluster_id = digitalocean_database_cluster.mongodb.id
  name       = local.system
}

resource "digitalocean_database_firewall" "k3s_agent" {
  cluster_id = digitalocean_database_cluster.mongodb.id

  rule {
    type  = "tag"
    value = data.digitalocean_tag.k3s_agent.id
  }
}

